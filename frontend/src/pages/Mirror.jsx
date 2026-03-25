import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Zap
} from 'lucide-react'
import { OCCASION_OPTIONS } from '../lib/mirrorConstants'
import { loadMirrorContext, saveMirrorContext } from '../lib/mirrorContextStorage'
import { buildMirrorWeatherPartialFromCoords, GEO_OPTIONS_DEFAULT } from '../lib/mirrorWeather'
import { getRedirectOrigin } from '../utils/auth0Redirect'
import { typeToEnglish, colorToEnglish, garmentClassLabel } from '../lib/classificationDisplay'

export default function Mirror() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const liveTimerRef = useRef(null)
  const lastFrameRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [liveMode, setLiveMode] = useState(false)

  const [mirrorPrefs, setMirrorPrefs] = useState(() => loadMirrorContext())
  /** Live Open-Meteo + geolocation pipeline status */
  const [weatherHookStatus, setWeatherHookStatus] = useState('locating')

  useEffect(() => {
    setMirrorPrefs(loadMirrorContext())
  }, [location.pathname])

  const prefs = mirrorPrefs
  const event = useMemo(() => {
    const opt = OCCASION_OPTIONS.find((o) => o.id === prefs.occasionId)
    return opt ? opt.label : prefs.occasionId
  }, [prefs.occasionId])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showRawJson, setShowRawJson] = useState(false)

  const [vitLoading, setVitLoading] = useState(false)
  const [vitResult, setVitResult] = useState(null)
  const [addToWardrobeLoading, setAddToWardrobeLoading] = useState(false)
  const [stylistAdvice, setStylistAdvice] = useState(null)
  const [classifyChatLoading, setClassifyChatLoading] = useState(false)

  const context = useMemo(() => {
    const ctx = {
      event,
      weather: prefs.weather,
      time: prefs.timeOfDay,
      user_profile: { style_preference: prefs.stylePref }
    }
    if (prefs.locationLabel) ctx.location = prefs.locationLabel
    return ctx
  }, [event, prefs.weather, prefs.timeOfDay, prefs.stylePref, prefs.locationLabel])

  /** On load: browser location prompt (if needed) → Open-Meteo + place name → saved context. */
  const refreshLocationWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setWeatherHookStatus('unsupported')
      return
    }
    setWeatherHookStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setWeatherHookStatus('fetching')
        try {
          const { latitude, longitude } = pos.coords
          const partial = await buildMirrorWeatherPartialFromCoords(latitude, longitude)
          saveMirrorContext(partial)
          setMirrorPrefs(loadMirrorContext())
          setWeatherHookStatus('ok')
        } catch (e) {
          console.error('Mirror weather fetch failed:', e)
          setWeatherHookStatus('error')
        }
      },
      (geoErr) => {
        const denied = geoErr?.code === 1
        setWeatherHookStatus(denied ? 'denied' : 'error')
      },
      GEO_OPTIONS_DEFAULT
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setWeatherHookStatus('unsupported')
      return
    }
    refreshLocationWeather()
  }, [refreshLocationWeather])

  /** Stop stream, clear live timer, release camera. */
  const stopCamera = () => {
    setLiveMode(false)
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current)
      liveTimerRef.current = null
    }
    const stream = streamRef.current
    streamRef.current = null
    if (stream) {
      for (const t of stream.getTracks()) t.stop()
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraOn(false)
  }

  /** Start user-facing camera and attach to video ref. */
  const startCamera = async () => {
    setError(null)
    setCameraStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support getUserMedia.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      streamRef.current = stream
      setCameraOn(true)
    } catch (err) {
      setError(err?.message || 'Could not open camera. Check browser permissions.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }

  /** When camera is on, attach stream to video element (video is only in DOM when cameraOn is true). */
  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return
    const video = videoRef.current
    const stream = streamRef.current
    video.srcObject = stream
    video.play().catch((err) => {
      console.error('Video play failed:', err)
      setError('Could not play camera. Try clicking the video or allow autoplay.')
    })
    return () => {
      video.srcObject = null
    }
  }, [cameraOn])

  /** @returns {string|null} data URL (image/jpeg) or null */
  const captureFrameDataUrl = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null

    const w = 640
    const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
    const h = Math.round(w / aspect)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.75)
  }

  /** Capture current frame, call /api/mirror/analyze-frame, show result. */
  const handleAnalyzeFrame = async () => {
    setError(null)
    setResult(null)
    setVitResult(null)
    setStylistAdvice(null)
    setLoading(true)
    try {
      const imageDataUrl = captureFrameDataUrl()
      if (!imageDataUrl) {
        throw new Error('Camera not ready yet. Wait a second and try again.')
      }
      lastFrameRef.current = imageDataUrl
      const { data } = await axios.post(
        '/api/mirror/analyze-frame',
        { imageDataUrl, context, userNotes: prefs.userNotes.trim() },
        { timeout: 65000 }
      )
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  /** Classify current frame with ViT via /api/classify/vit-base64. */
  const handleClassifyVit = async () => {
    setError(null)
    setVitResult(null)
    setStylistAdvice(null)
    setVitLoading(true)
    try {
      const imageDataUrl = captureFrameDataUrl()
      if (!imageDataUrl) {
        throw new Error('Camera not ready. Turn it on and capture a frame.')
      }
      lastFrameRef.current = imageDataUrl
      const { data } = await axios.post('/api/classify/vit-base64', { imageDataUrl }, { timeout: 35000 })
      setVitResult({
        tipo: data.tipo || 'top',
        color: data.color || 'unknown',
        clase_nombre: data.clase_nombre || 'unknown',
        confianza: typeof data.confianza === 'number' ? data.confianza : 0.5,
        top3: Array.isArray(data.top3) ? data.top3 : []
      })
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message)
    } finally {
      setVitLoading(false)
    }
  }

  /**
   * Classify the current frame (ViT), then ask the wardrobe chat for opinion and improvements.
   * Chat uses wardrobe context; the model only receives text (classification summary), not the image.
   */
  const handleClassifyAndAskStylist = async () => {
    if (!isAuthenticated) {
      loginWithRedirect({ authorizationParams: { redirect_uri: getRedirectOrigin() } })
      return
    }
    setError(null)
    setStylistAdvice(null)
    setClassifyChatLoading(true)
    try {
      const imageDataUrl = captureFrameDataUrl()
      if (!imageDataUrl) {
        throw new Error('Camera not ready. Turn it on and wait a moment.')
      }
      lastFrameRef.current = imageDataUrl

      const { data: classifyData } = await axios.post('/api/classify/vit-base64', { imageDataUrl }, { timeout: 35000 })
      const summary = {
        tipo: classifyData.tipo || 'top',
        color: classifyData.color || 'unknown',
        clase_nombre: classifyData.clase_nombre || 'unknown',
        confianza: typeof classifyData.confianza === 'number' ? classifyData.confianza : 0.5,
        top3: Array.isArray(classifyData.top3) ? classifyData.top3 : []
      }
      setVitResult(summary)

      const topLines =
        summary.top3.length > 0
          ? summary.top3
              .slice(0, 3)
              .map((t, i) => {
                const name = t.clase_nombre != null && String(t.clase_nombre).trim() !== '' ? garmentClassLabel(t.clase_nombre) : '?'
                const pct = typeof t.confianza === 'number' ? (t.confianza * 100).toFixed(0) : '?'
                return `  ${i + 1}. ${name} (${pct}% confidence, garment type: ${typeToEnglish(t.tipo)})`
              })
              .join('\n')
          : '  (no alternative predictions)'

      const userMessage = [
        'I just captured a photo from the Mirror. Our outfit classifier analyzed the image. Here is what it detected:',
        `Main prediction: ${garmentClassLabel(summary.clase_nombre)} — garment type: ${typeToEnglish(summary.tipo)}, color signal: ${colorToEnglish(summary.color)}, model confidence ${(summary.confianza * 100).toFixed(0)}%.`,
        'Top predictions:',
        topLines,
        '',
        'Mirror context for what I am dressing for:',
        `- Occasion: ${event}`,
        `- Weather: ${context.weather ?? '—'}`,
        `- Time of day: ${context.time ?? '—'}`,
        context.location ? `- Location: ${context.location}` : '',
        `- Style preference: ${context.user_profile?.style_preference ?? '—'}`,
        prefs.userNotes.trim() ? `- My notes: ${prefs.userNotes.trim()}` : '',
        '',
        'You do not have the photo—only this machine classification. Tell me how you like this outfit direction, what already works, and specific changes I could make to improve the look for this occasion. If it helps, suggest swaps using pieces from my wardrobe.'
      ]
        .filter(Boolean)
        .join('\n')

      const { data: chatData } = await axios.post(
        '/api/chat',
        { messages: [{ role: 'user', content: userMessage }] },
        { timeout: 90000 }
      )
      const reply = chatData?.reply || chatData?.message?.content
      if (!reply) {
        throw new Error('Empty response from stylist chat.')
      }
      setStylistAdvice(reply)
    } catch (err) {
      const msg =
        err.response?.status === 401
          ? 'Please sign in to use the wardrobe stylist chat.'
          : err.response?.data?.error || err.response?.data?.detail || err.message
      setError(msg)
    } finally {
      setClassifyChatLoading(false)
    }
  }

  /** Add selected detected item to wardrobe via /api/prendas/auto. */
  const handleAddToWardrobe = async () => {
    if (!vitResult) return
    const imageDataUrl = lastFrameRef.current
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      setError('No recent frame. Run "Classify ViT" first.')
      return
    }
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    setAddToWardrobeLoading(true)
    setError(null)
    try {
      await axios.post('/api/prendas/auto', {
        imagen_base64: base64,
        tipo: vitResult.tipo,
        color: vitResult.color,
        clase_nombre: vitResult.clase_nombre,
        confianza: vitResult.confianza,
        ocasion: []
      }, { timeout: 15000 })
      setVitResult(null)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || err.message)
    } finally {
      setAddToWardrobeLoading(false)
    }
  }

  useEffect(() => {
    if (!liveMode) {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current)
        liveTimerRef.current = null
      }
      return
    }
    // evaluación “en directo”: 1 request cada 4s, evitando solapamientos
    liveTimerRef.current = setInterval(() => {
      if (!cameraOn || loading || classifyChatLoading) return
      handleAnalyzeFrame()
    }, 4000)
    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current)
        liveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, cameraOn, loading, classifyChatLoading])

  useEffect(() => {
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const payload = location.state?.mirrorResult
    if (payload) {
      setResult(payload)
      navigate('/mirror', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const analysis = result?.analysis
  const newItems = result?.new_detected_items ?? []

  return (
    <div className="min-h-dvh" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-5 lg:px-8 py-5 sm:py-8 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))]">
        <header className="mb-6">
          <h1 className="sw-heading text-[#0D0D0D] text-2xl font-semibold tracking-tight">Mirror</h1>
          <p className="text-sm text-[#888] mt-0.5">Get AI feedback on your outfit in real time</p>
        </header>

        <div className="max-w-3xl mx-auto space-y-4">
          <div className="rounded-2xl border border-[#D0CEC8] bg-[#fafaf9] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="h-4 w-4 text-[#FF3B00] shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 text-sm">
                {(weatherHookStatus === 'locating' || weatherHookStatus === 'fetching') && (
                  <p className="text-[#0D0D0D] font-medium flex items-center gap-2">
                    {weatherHookStatus === 'locating' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Requesting location…
                      </>
                    )}
                    {weatherHookStatus === 'fetching' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Fetching live weather…
                      </>
                    )}
                  </p>
                )}
                {weatherHookStatus === 'ok' && (
                  <>
                    <p className="text-[#0D0D0D] font-medium">Weather connected</p>
                    <p className="text-[#888] text-xs mt-0.5 truncate" title={prefs.locationLabel ? `${prefs.locationLabel} · ${prefs.weather}` : prefs.weather}>
                      {prefs.locationLabel ? <span className="font-medium text-[#555]">{prefs.locationLabel}</span> : null}
                      {prefs.locationLabel ? <span className="text-[#D0CEC8] mx-1">·</span> : null}
                      <span>{prefs.weather}</span>
                      <span className="text-[#D0CEC8] mx-1">·</span>
                      <span>{prefs.timeOfDay}</span>
                    </p>
                  </>
                )}
                {weatherHookStatus === 'denied' && (
                  <p className="text-[#0D0D0D]">
                    <span className="font-medium">Location off</span>
                    <span className="text-[#888]"> — using saved context. Allow location in the browser bar, or set weather on the context page.</span>
                  </p>
                )}
                {(weatherHookStatus === 'error' || weatherHookStatus === 'unsupported') && (
                  <p className="text-[#0D0D0D]">
                    <span className="font-medium">{weatherHookStatus === 'unsupported' ? 'Geolocation not available' : 'Could not update weather'}</span>
                    <span className="text-[#888]"> — edit manually on the context page if needed.</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={refreshLocationWeather}
              disabled={weatherHookStatus === 'locating' || weatherHookStatus === 'fetching' || weatherHookStatus === 'unsupported'}
              className="sw-btn sw-btn-outline sw-btn-sm shrink-0 justify-center disabled:opacity-50"
            >
              Refresh weather
            </button>
          </div>

          <section className="sw-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D0CEC8] flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#888]">Camera</span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/mirror/context"
                  className="sw-btn sw-btn-outline sw-btn-sm flex items-center gap-1.5 min-h-[40px]"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Context</span>
                </Link>
                {!cameraOn ? (
                  <button onClick={startCamera} disabled={cameraStarting} className="sw-btn sw-btn-accent sw-btn-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {cameraStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Start
                  </button>
                ) : (
                  <button onClick={stopCamera} className="sw-btn sw-btn-outline sw-btn-sm flex items-center gap-2 transition-colors">
                    <CameraOff className="h-4 w-4" /> Stop
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-[#888] mb-3 leading-relaxed">
                <span className="font-medium text-[#0D0D0D]">AI context:</span>{' '}
                <span className="text-[#555]">{event}</span>
                <span className="text-[#D0CEC8] mx-1">·</span>
                <span className="text-[#555]">{prefs.weather}</span>
                <span className="text-[#D0CEC8] mx-1">·</span>
                <span className="text-[#555]">{prefs.timeOfDay}</span>
                {prefs.locationLabel ? (
                  <>
                    <span className="text-[#D0CEC8] mx-1">·</span>
                    <span className="text-[#555]" title={prefs.locationLabel}>
                      {prefs.locationLabel}
                    </span>
                  </>
                ) : null}
                <span className="text-[#D0CEC8] mx-1">·</span>
                <Link to="/mirror/context" className="text-[#FF3B00] font-semibold underline underline-offset-2">
                  Edit on context page
                </Link>
              </p>
              <div className="aspect-video rounded-xl overflow-hidden border border-[#D0CEC8] bg-white flex items-center justify-center relative">
                {!cameraOn ? (
                  <div className="text-center py-8 px-4">
                    <div className="w-14 h-14 rounded-full bg-[#E8E6E0] flex items-center justify-center mx-auto mb-3">
                      <Camera className="h-7 w-7 text-[#888]" />
                    </div>
                    <p className="text-sm text-[#888]">Start camera to see yourself and evaluate your outfit</p>
                  </div>
                ) : (
                  <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
                )}

                <Link
                  to="/mirror/context"
                  className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full border border-[#D0CEC8] bg-white/95 px-3 py-2 text-xs font-semibold text-[#0D0D0D] shadow-md backdrop-blur-sm hover:bg-white hover:border-[#0D0D0D] transition-colors min-h-[44px]"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  Context
                  <span className="max-w-[90px] truncate text-[#888] font-normal hidden sm:inline" title={event}>
                    · {event}
                  </span>
                </Link>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                <button onClick={handleAnalyzeFrame} disabled={!cameraOn || loading || classifyChatLoading} className="sw-btn sw-btn-primary sw-btn-sm w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Evaluate outfit
                </button>
                <button onClick={handleClassifyVit} disabled={!cameraOn || vitLoading || classifyChatLoading} className="sw-btn sw-btn-outline sw-btn-sm w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center disabled:opacity-40 flex items-center gap-2 transition-colors">
                  {vitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Classify ViT
                </button>
                <button
                  onClick={handleClassifyAndAskStylist}
                  disabled={!cameraOn || classifyChatLoading}
                  className="sw-btn sw-btn-outline sw-btn-sm w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center disabled:opacity-40 flex items-center gap-2 transition-colors border-[#0D0D0D] text-[#0D0D0D]"
                >
                  {classifyChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Classify + stylist chat
                </button>
                <button onClick={() => setLiveMode((v) => !v)} disabled={!cameraOn || classifyChatLoading} className={`sw-btn sw-btn-sm w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center flex items-center gap-2 transition-colors ${liveMode ? 'sw-btn-accent' : 'sw-btn-ghost'}`}>
                  <Zap className="h-4 w-4" /> Live {liveMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {vitResult && (
                <div className="mt-4 p-4 sw-card rounded-xl">
                  <p className="text-xs text-[#888] mb-1">Detected (ViT)</p>
                  <p className="text-base font-medium text-[#0D0D0D]">{garmentClassLabel(vitResult.clase_nombre)}</p>
                  <p className="text-sm text-[#888]">
                    {typeToEnglish(vitResult.tipo)} · {colorToEnglish(vitResult.color)} · {(vitResult.confianza * 100).toFixed(0)}%
                  </p>
                  {Array.isArray(vitResult.top3) && vitResult.top3.length > 1 && (
                    <ul className="mt-2 text-xs text-[#888] space-y-1 list-disc list-inside">
                      {vitResult.top3.slice(0, 3).map((t, i) => (
                        <li key={i}>
                          {t.clase_nombre != null && String(t.clase_nombre).trim() !== '' ? garmentClassLabel(t.clase_nombre) : '?'} ({typeToEnglish(t.tipo)}) · {(typeof t.confianza === 'number' ? t.confianza * 100 : 0).toFixed(0)}%
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={handleAddToWardrobe} disabled={addToWardrobeLoading} className="mt-3 sw-btn sw-btn-accent sw-btn-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                    {addToWardrobeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    Add to wardrobe
                  </button>
                </div>
              )}
              {stylistAdvice && (
                <div className="mt-4 p-4 sw-card rounded-xl border border-[#D0CEC8]">
                  <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Wardrobe stylist (from your classification)
                  </p>
                  <p className="text-sm text-[#0D0D0D] leading-relaxed whitespace-pre-wrap">{stylistAdvice}</p>
                  <Link to="/chat" className="inline-block mt-3 text-xs font-semibold text-[#FF3B00] underline underline-offset-2">
                    Continue in Chat
                  </Link>
                </div>
              )}
              <p className="mt-3 text-xs text-[#888]">
                Evaluate outfit uses vision (OpenRouter). Classify + stylist chat runs ViT on the frame, then sends that summary to your wardrobe chat (sign in required). Items are only saved when you click Add to wardrobe.
              </p>
            </div>
          </section>
        </div>

        {error && (
          <div className="mt-6 p-4 sw-card rounded border border-[#FF3B00] text-sm" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            {analysis && (
              <section className="sw-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#D0CEC8]">
                  <span className="text-sm font-medium text-[#888]">Analysis</span>
                </div>
                <div className="p-5">
                  <div className="flex gap-6 sm:gap-8 mb-6">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-[#D0CEC8] bg-white flex flex-col items-center justify-center">
                        <span className="text-xl font-semibold text-[#0D0D0D] tabular-nums leading-none">{analysis.overall_score ?? '—'}</span>
                        <span className="text-[10px] text-[#888]">/100</span>
                      </div>
                      <p className="text-xs text-[#888] mt-2">Score</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-[#D0CEC8] bg-white flex flex-col items-center justify-center">
                        <span className="text-xl font-semibold text-[#0D0D0D] tabular-nums leading-none">{analysis.confidence_score ?? '—'}</span>
                        <span className="text-[10px] text-[#888]">/100</span>
                      </div>
                      <p className="text-xs text-[#888] mt-2">Confidence</p>
                    </div>
                  </div>
                  <dl className="space-y-3 text-sm">
                    {analysis.style_identity && <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2"><dt className="text-[#888]">Style</dt><dd className="text-[#0D0D0D] text-right">{analysis.style_identity}</dd></div>}
                    {analysis.silhouette_balance && <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2"><dt className="text-[#888]">Silhouette</dt><dd className="text-[#0D0D0D] text-right">{analysis.silhouette_balance}</dd></div>}
                    {analysis.color_analysis && (
                      <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2">
                        <dt className="text-[#888]">Color</dt>
                        <dd className="text-[#0D0D0D] text-right">
                          {[analysis.color_analysis.palette_type, analysis.color_analysis.contrast_level, analysis.color_analysis.harmony_score != null && `harmony ${analysis.color_analysis.harmony_score}`].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                    )}
                    {analysis.fit_evaluation && <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2"><dt className="text-[#888]">Fit</dt><dd className="text-[#0D0D0D] text-right">{analysis.fit_evaluation}</dd></div>}
                    {analysis.occasion_alignment && <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2"><dt className="text-[#888]">Occasion</dt><dd className="text-[#0D0D0D] text-right">{analysis.occasion_alignment}</dd></div>}
                    {analysis.seasonal_match && <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/80 pb-2"><dt className="text-[#888]">Season</dt><dd className="text-[#0D0D0D] text-right">{analysis.seasonal_match}</dd></div>}
                  </dl>
                  {analysis.expert_feedback && (
                    <div className="mt-5 pt-4 border-t border-[#D0CEC8]">
                      <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Tips for {event}</p>
                      <div className="rounded-xl bg-[#E8E6E0] border border-[#D0CEC8] px-4 py-3">
                        <p className="text-sm text-[#0D0D0D] leading-relaxed">{analysis.expert_feedback}</p>
                      </div>
                    </div>
                  )}
                  {Array.isArray(analysis.upgrade_suggestions) && analysis.upgrade_suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#D0CEC8]">
                      <p className="text-xs text-[#888] mb-2">Suggestions</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.upgrade_suggestions.map((s, i) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-[#E8E6E0] text-[#0D0D0D] border border-[#D0CEC8]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {newItems.length > 0 && (
              <section className="sw-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#D0CEC8] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#888]" />
                  <span className="text-sm font-medium text-[#888]">Detected items</span>
                </div>
                <ul className="p-4 space-y-3">
                  {newItems.map((item, i) => (
                    <li key={i} className="py-2 border-b border-[#D0CEC8]/80 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-[#0D0D0D]">{item.name || 'Unnamed'}</p>
                      <p className="text-xs text-[#888]">
                        {typeToEnglish(item.category)} · {colorToEnglish(item.primary_color)}
                        {item.style_category ? ` · ${item.style_category}` : ''}
                      </p>
                      {item.recommend_add_to_database && <span className="text-xs text-emerald-500 mt-1 block">Recommended to add to wardrobe</span>}
                    </li>
                  ))}
                </ul>
                <p className="px-4 pb-4 text-xs text-[#888]">Use Classify ViT + Add to wardrobe to save.</p>
              </section>
            )}

            <div>
              <button onClick={() => setShowRawJson((v) => !v)} className="sw-btn sw-btn-ghost sw-btn-sm flex items-center gap-1">
                {showRawJson ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                JSON
              </button>
              {showRawJson && <pre className="mt-2 p-4 rounded border border-[#D0CEC8] bg-[#E8E6E0] text-[#0D0D0D] text-xs overflow-auto max-h-80 font-mono">{JSON.stringify(result, null, 2)}</pre>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
