import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { Mic, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { getRedirectOrigin } from '../utils/auth0Redirect'
import SavedOutfitGridCard from '../components/SavedOutfitGridCard'
import { outfitRecommendUrl } from '../lib/outfitRecommendQuery'
import { buildSaveOutfitPayload, getComboKey } from '../utils/outfitHelpers'
import { encodeFloat32PcmToWavBase64, mergeFloat32Chunks } from '../utils/wavEncoder'
import micCaptureWorkletUrl from '../worklets/micCaptureProcessor.js?url'

const VOICE_PREFS_KEY = 'fashion-ai-chat-voice-replies'

function readVoiceRepliesPreference() {
  try {
    const v = localStorage.getItem(VOICE_PREFS_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

const WELCOME = {
  role: 'assistant',
  content:
    "Hi. I'm your style assistant—tell me what you're doing today (work, dinner, weather, etc.) and I'll suggest outfits using only what's in your wardrobe."
}

function messagesForApi(messages) {
  return messages.map(({ role, content }) => ({ role, content }))
}

/** Safety: never show OUTFIT_PARAMS markers if the model leaked them into content. */
function stripOutfitMarkersForDisplay(text) {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/<<<OUTFIT_PARAMS>>>[\s\S]*?<<<END_OUTFIT_PARAMS>>>/g, '')
    .replace(/<<<OUTFIT_PARAMS>>>[\s\S]*/g, '')
    .replace(/<<<END_OUTFIT_PARAMS>>>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function WardrobeChat() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [savingChatKey, setSavingChatKey] = useState(null)
  const [voiceReplies, setVoiceReplies] = useState(readVoiceRepliesPreference)
  const [recording, setRecording] = useState(false)
  const bottomRef = useRef(null)
  const ttsAudioRef = useRef(null)
  const mediaStreamRef = useRef(null)
  /** PCM capture for transcription (WAV → OpenRouter; avoids webm, which providers reject). */
  const micCtxRef = useRef(null)
  const micWorkletRef = useRef(null)
  const micSourceRef = useRef(null)
  const micGainRef = useRef(null)
  const micPcmChunksRef = useRef([])

  useEffect(() => {
    return () => {
      ttsAudioRef.current?.pause()
      const w = micWorkletRef.current
      if (w?.port) w.port.onmessage = null
      w?.disconnect()
      micSourceRef.current?.disconnect()
      micGainRef.current?.disconnect()
      micCtxRef.current?.close?.().catch(() => {})
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_PREFS_KEY, voiceReplies ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [voiceReplies])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const playAssistantTts = useCallback(async (text) => {
    if (!voiceReplies || !text?.trim()) return
    try {
      const { data } = await axios.post('/api/chat/tts', { text: text.trim() }, { timeout: 180000 })
      const b64 = data?.audioBase64
      if (!b64) return
      const mime = data.mimeType || 'audio/wav'
      const prev = ttsAudioRef.current
      if (prev) {
        prev.pause()
        prev.src = ''
      }
      const audio = new Audio(`data:${mime};base64,${b64}`)
      ttsAudioRef.current = audio
      audio.play().catch(() => {
        /* autoplay policy: user already interacted via Send */
      })
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message
      console.warn('[WardrobeChat] TTS failed:', msg)
    }
  }, [voiceReplies])

  const stopRecordingAndTranscribe = useCallback(async (options = {}) => {
    const { appendToInput = true } = options
    const worklet = micWorkletRef.current
    const ctx = micCtxRef.current
    const source = micSourceRef.current
    const gain = micGainRef.current

    if (!worklet || !ctx) {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
      setRecording(false)
      return ''
    }

    const sampleRate = ctx.sampleRate
    worklet.port.onmessage = null
    worklet.disconnect()
    source?.disconnect()
    gain?.disconnect()
    micWorkletRef.current = null
    micSourceRef.current = null
    micGainRef.current = null
    await ctx.close().catch(() => {})
    micCtxRef.current = null

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    setRecording(false)

    const chunks = micPcmChunksRef.current
    micPcmChunksRef.current = []
    const merged = mergeFloat32Chunks(chunks)
    const minSamples = Math.floor(sampleRate * 0.15)
    if (merged.length < minSamples) {
      setError('Recording was too short. Try again.')
      return ''
    }

    let base64
    try {
      base64 = encodeFloat32PcmToWavBase64(merged, sampleRate)
    } catch {
      setError('Could not encode audio. Try again.')
      return ''
    }

    setError(null)
    try {
      const { data } = await axios.post(
        '/api/chat/transcribe',
        { audioBase64: base64, format: 'wav' },
        { timeout: 120000 }
      )
      const t = data?.text?.trim()
      if (!t) {
        setError('Could not transcribe the audio. Try again or type your message.')
        return ''
      }
      if (appendToInput) {
        setInput((prev) => (prev ? `${prev.trimEnd()} ${t}` : t))
      }
      return t
    } catch (e) {
      const detail = e.response?.data?.detail
      const errMsg = e.response?.data?.error
      const hint = e.response?.data?.hint
      const msg =
        e.response?.status === 503
          ? 'Voice input needs OpenRouter on the server (OPENROUTER_API_KEY + audio model).'
          : e.response?.status === 502 && hint
            ? String(hint)
            : e.response?.status === 400 && detail
              ? typeof detail === 'string'
                ? detail
                : errMsg || 'The audio could not be transcribed. Try again.'
              : errMsg || detail || e.message || 'Transcription failed.'
      setError(msg)
      return ''
    }
  }, [])

  const toggleRecording = useCallback(async () => {
    setError(null)
    if (recording) {
      await stopRecordingAndTranscribe({ appendToInput: true })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not available in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) {
        setError('Audio recording is not supported in this browser.')
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const ctx = new AudioCtx()
      await ctx.resume()
      if (!ctx.audioWorklet?.addModule) {
        stream.getTracks().forEach((t) => t.stop())
        setError('AudioWorklet is not available in this browser.')
        return
      }
      try {
        await ctx.audioWorklet.addModule(micCaptureWorkletUrl)
      } catch {
        stream.getTracks().forEach((t) => t.stop())
        setError('Could not load the microphone capture module. Try refreshing the page.')
        await ctx.close().catch(() => {})
        return
      }
      const source = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'mic-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: 'explicit'
      })
      micPcmChunksRef.current = []
      worklet.port.onmessage = (ev) => {
        if (ev.data instanceof Float32Array) micPcmChunksRef.current.push(ev.data)
      }
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(worklet)
      worklet.connect(gain)
      gain.connect(ctx.destination)

      mediaStreamRef.current = stream
      micCtxRef.current = ctx
      micWorkletRef.current = worklet
      micSourceRef.current = source
      micGainRef.current = gain
      setRecording(true)
    } catch (e) {
      setError(e.message || 'Microphone permission denied.')
    }
  }, [recording, stopRecordingAndTranscribe])

  const send = useCallback(async () => {
    let text = input.trim()
    if (recording) {
      const spoken = await stopRecordingAndTranscribe({ appendToInput: false })
      text = [text, spoken].filter(Boolean).join(' ').trim()
    }
    if (!text || sending) return
    setError(null)
    const userMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      const { data } = await axios.post(
        '/api/chat',
        { messages: [...messagesForApi(messages), userMessage] },
        { timeout: 90000 }
      )
      const reply = data?.reply || data?.message?.content
      if (!reply) {
        setError('Empty response from the server.')
        return
      }
      const outfitGeneration =
        data?.outfitGeneration && typeof data.outfitGeneration === 'object' ? data.outfitGeneration : null

      let chatOutfits = null
      let chatOutfitsError = null
      if (outfitGeneration) {
        try {
          const { data: recs } = await axios.get(outfitRecommendUrl(outfitGeneration), { timeout: 30000 })
          chatOutfits = Array.isArray(recs) ? recs : []
        } catch (e) {
          chatOutfitsError =
            e.response?.data?.error || 'Could not load outfit previews. Try Generate with these settings.'
          chatOutfits = []
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          ...(outfitGeneration ? { outfitGeneration } : {}),
          ...(chatOutfits !== null ? { chatOutfits } : {}),
          ...(chatOutfitsError ? { chatOutfitsError } : {})
        }
      ])
      setTimeout(scrollToBottom, 100)
      playAssistantTts(reply)
    } catch (e) {
      const msg =
        e.response?.status === 401
          ? 'Please sign in to use the chat.'
          : e.response?.status === 503
            ? 'OpenRouter is not configured on the server (OPENROUTER_API_KEY).'
            : e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to send the message.'
      setError(msg)
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
    } finally {
      setSending(false)
    }
  }, [input, messages, sending, recording, stopRecordingAndTranscribe, playAssistantTts])

  const saveChatOutfit = useCallback(async (outfit, messageIndex, outfitIndex) => {
    const body = buildSaveOutfitPayload(outfit)
    if (!body) {
      window.alert('This outfit is missing garments and cannot be saved.')
      return
    }
    const key = `${messageIndex}-${outfitIndex}`
    setSavingChatKey(key)
    try {
      await axios.post('/api/outfits/save', body)
      const ck = getComboKey(outfit)
      setMessages((prev) =>
        prev.map((m, i) => {
          if (i !== messageIndex || !Array.isArray(m.chatOutfits)) return m
          return {
            ...m,
            chatOutfits: ck ? m.chatOutfits.filter((o) => getComboKey(o) !== ck) : m.chatOutfits
          }
        })
      )
    } catch (err) {
      console.error(err)
      window.alert(err.response?.data?.error || 'Could not save the outfit.')
    } finally {
      setSavingChatKey(null)
    }
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-dvh sw-light flex items-center justify-center" style={{ background: 'var(--sw-white)' }}>
        <p className="sw-label text-[#888]">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5 lg:px-8 py-12 sm:py-16">
          <div className="sw-card rounded-2xl border border-[#D0CEC8] p-10 text-center">
            <p className="sw-label text-[#FF3B00] mb-2">— CHAT</p>
            <h1 className="sw-display text-2xl sm:text-3xl mb-4">Wardrobe assistant</h1>
            <p className="text-[#555] mb-8">Sign in to chat and get recommendations based on your garments.</p>
            <button
              type="button"
              onClick={() => loginWithRedirect({ authorizationParams: { redirect_uri: getRedirectOrigin() } })}
              className="sw-btn sw-btn-primary sw-btn-lg"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-dvh sw-light flex flex-col text-[#0D0D0D]"
      style={{ background: 'var(--sw-white, #F5F4F0)' }}
    >
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-5 lg:px-8 py-6 sm:py-8 flex flex-col flex-1 min-h-0 min-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] lg:min-h-[calc(100dvh-6.5rem)]">
        <div className="pb-6 mb-6 border-b border-[#0D0D0D]">
          <p className="sw-label text-[#FF3B00] mb-2">— WARDROBE CHAT</p>
          <h1 className="sw-display text-[#0D0D0D]" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
            STYLE ASSISTANT
          </h1>
          <p className="sw-label text-[#555] mt-2 [&_strong]:text-[#0D0D0D]">
            The assistant uses the same outfit engine as <strong>Generate</strong>: when it suggests a look, matching
            combinations from your wardrobe appear as cards below the reply. You can save them here or open{' '}
            <strong>Generate</strong> for more. Mic = speech-to-text; speaker = read replies aloud.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 min-h-[min(240px,35dvh)] max-h-[min(52dvh,calc(100dvh-15rem))] lg:max-h-[min(60dvh,calc(100dvh-14rem))] pr-1">
          {messages.map((m, i) => (
            <div key={`${i}-${m.role}`} className="space-y-2">
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-left text-sm sm:text-base leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#0D0D0D] text-[#fafaf9] shadow-sm'
                      : 'bg-white border border-[#D0CEC8] text-[#0D0D0D]'
                  }`}
                >
                  {stripOutfitMarkersForDisplay(m.content)
                    .split('\n')
                    .map((line, j) => (
                      <span key={j}>
                        {j > 0 && <br />}
                        {line}
                      </span>
                    ))}
                </div>
              </div>
              {m.role === 'assistant' && Array.isArray(m.chatOutfits) && m.chatOutfits.length > 0 && (
                <div className="space-y-2 pl-0 sm:pl-1">
                  <p className="sw-label text-[#888] text-[0.65rem] tracking-wide">FROM YOUR WARDROBE</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {m.chatOutfits.map((outfit, oi) => (
                      <SavedOutfitGridCard
                        key={`${i}-${oi}-${getComboKey(outfit) || oi}`}
                        outfit={outfit}
                        saveToWardrobeLoading={savingChatKey === `${i}-${oi}`}
                        onSaveToWardrobe={() => saveChatOutfit(outfit, i, oi)}
                        onOpen={() => navigate('/generate/outfit', { state: { outfit } })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {m.role === 'assistant' && m.chatOutfitsError && (
                <p className="text-sm text-[#888] border border-[#D0CEC8] rounded-xl px-3 py-2 bg-[#fafaf9]">
                  {m.chatOutfitsError}
                </p>
              )}
              {m.role === 'assistant' && m.outfitGeneration && (
                <div className="flex flex-wrap gap-2 justify-start">
                  <Link
                    to="/generate"
                    state={{ chatPreferences: m.outfitGeneration }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0D0D0D] bg-[#0D0D0D] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#fafaf9] hover:bg-[#FF3B00] hover:border-[#FF3B00] hover:text-[#0D0D0D] transition-colors no-underline [&_svg]:text-inherit"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" aria-hidden />
                    Open Generate (same settings)
                  </Link>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2 mt-auto pb-[env(safe-area-inset-bottom,0px)] rounded-2xl bg-[#fafaf9] border border-[#D0CEC8] p-3 sm:p-2.5">
          <textarea
            className="w-full min-w-0 min-h-[88px] max-h-40 sm:min-h-[52px] sm:flex-1 sm:order-2 rounded-xl border-2 border-[#D0CEC8] bg-white px-3 py-3 sm:px-4 text-base sm:text-sm text-[#0D0D0D] caret-[#0D0D0D] placeholder:text-[#666] shadow-inner focus:outline-none focus:border-[#0D0D0D] focus:ring-2 focus:ring-[#FF3B00]/35 resize-y"
            placeholder="What are you doing today? (e.g. work, dinner, weather…)"
            value={input}
            disabled={sending || recording}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={3}
          />
          <div className="flex gap-2 items-stretch sm:contents">
            <button
              type="button"
              onClick={() => setVoiceReplies((v) => !v)}
              className={`shrink-0 h-11 w-11 sm:h-[52px] sm:w-[52px] sm:order-1 rounded-xl border-2 inline-flex items-center justify-center transition-colors ${
                voiceReplies
                  ? 'border-[#0D0D0D] bg-[#0D0D0D] text-[#fafaf9]'
                  : 'border-[#D0CEC8] bg-white text-[#0D0D0D]'
              }`}
              aria-pressed={voiceReplies}
              aria-label={voiceReplies ? 'Disable spoken replies' : 'Enable spoken replies'}
              title="Spoken replies (TTS)"
            >
              {voiceReplies ? <Volume2 size={20} className="sm:w-[22px] sm:h-[22px]" /> : <VolumeX size={20} className="sm:w-[22px] sm:h-[22px]" />}
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={sending}
              className={`shrink-0 h-11 w-11 sm:h-[52px] sm:w-[52px] sm:order-3 rounded-xl border-2 inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
                recording
                  ? 'border-[#FF3B00] bg-[#FF3B00]/15 text-[#FF3B00] animate-pulse'
                  : 'border-[#D0CEC8] bg-white text-[#0D0D0D] hover:border-[#0D0D0D]'
              }`}
              aria-pressed={recording}
              aria-label={recording ? 'Stop recording and transcribe' : 'Start voice input'}
              title={recording ? 'Stop & transcribe' : 'Voice input'}
            >
              <Mic size={20} className="sm:w-[22px] sm:h-[22px]" />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim() || recording}
              className="flex-1 min-h-11 sm:order-4 sm:flex-initial sm:h-[52px] sm:min-w-0 sw-btn sw-btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 sm:px-5 disabled:opacity-50 !text-[#fafaf9] hover:!text-[#0D0D0D] text-sm font-black uppercase tracking-wide"
              aria-label="Send"
            >
              <Send size={18} className="sm:w-5 sm:h-5 shrink-0" />
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
