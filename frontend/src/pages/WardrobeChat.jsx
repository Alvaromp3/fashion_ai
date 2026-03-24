import { useCallback, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { Send } from 'lucide-react'
import { getRedirectOrigin } from '../utils/auth0Redirect'

const WELCOME = {
  role: 'assistant',
  content:
    "Hi. I'm your style assistant—tell me what you're doing today (work, dinner, weather, etc.) and I'll suggest outfits using only what's in your wardrobe."
}

export default function WardrobeChat() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      const { data } = await axios.post('/api/chat', { messages: nextMessages }, { timeout: 90000 })
      const reply = data?.reply || data?.message?.content
      if (!reply) {
        setError('Empty response from the server.')
        return
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      setTimeout(scrollToBottom, 100)
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
  }, [input, messages, sending])

  if (authLoading) {
    return (
      <div className="min-h-screen sw-light flex items-center justify-center" style={{ background: 'var(--sw-white)' }}>
        <p className="sw-label text-[#888]">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen sw-light" style={{ background: 'var(--sw-white)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
    <div className="min-h-screen sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-[calc(100vh-6rem)]">
        <div className="pb-6 mb-6 border-b border-[#0D0D0D]">
          <p className="sw-label text-[#FF3B00] mb-2">— WARDROBE CHAT</p>
          <h1 className="sw-display" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
            STYLE ASSISTANT
          </h1>
          <p className="sw-label text-[#888] mt-2">
            Recommendations from your wardrobe and your plans for the day (OpenRouter).
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[240px] max-h-[55vh] sm:max-h-[60vh] pr-1">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-left text-sm sm:text-base leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0D0D0D] text-white'
                    : 'bg-white border border-[#D0CEC8] text-[#0D0D0D]'
                }`}
              >
                {m.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="flex gap-2 items-end mt-auto">
          <textarea
            className="flex-1 min-h-[52px] max-h-40 rounded-xl border border-[#D0CEC8] bg-white px-4 py-3 text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#FF3B00]/40 resize-y"
            placeholder="E.g. Casual meeting in the morning and gym in the evening…"
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 sw-btn sw-btn-primary h-[52px] px-5 rounded-xl inline-flex items-center gap-2 disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={20} />
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
