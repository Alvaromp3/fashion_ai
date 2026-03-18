import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  ScanLine,
  Sparkles,
  Zap
} from 'lucide-react'

/** Open-Meteo weather code → English label */
const WEATHER_CODES = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'frost',
  51: 'drizzle',
  53: 'drizzle',
  55: 'dense drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'showers',
  81: 'showers',
  82: 'heavy showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'severe thunderstorm'
}

const DEFAULT_ADVANCED_PROMPT = `Detected garments (YOLO):
- Navy blazer (0.94), grey trousers (0.91), white sneakers (0.96)
Pose: upright, balanced. Profile: minimal smart casual.
Context: business casual meeting, 16°C, afternoon.
Evaluate outfit and detect new items.`

/** Occasion / style options for outfit feedback. User picks one; AI tailors tips to it. */
const OCCASION_OPTIONS = [
  { id: 'business-casual', label: 'Business casual' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'casual', label: 'Casual' },
  { id: 'gym', label: 'Gym / Sport' },
  { id: 'smart-casual', label: 'Smart casual' },
  { id: 'formal', label: 'Formal' },
  { id: 'date-night', label: 'Date night' },
  { id: 'beach', label: 'Beach / Vacation' },
  { id: 'work-from-home', label: 'Work from home' }
]

export default function Mirror() {
  const typeToEnglish = (raw) => {
    if (raw == null || raw === '') return ''
    const map = {
      superior: 'TOP',
      inferior: 'BOTTOM',
      zapatos: 'SHOES',
      abrigo: 'COAT',
      vestido: 'DRESS',
      bolso: 'BAG',
      accesorio: 'ACCESSORY',
      'joyería': 'JEWELRY',
      joyeria: 'JEWELRY',
      sombrero: 'HAT',
      'cinturón': 'BELT',
      cinturon: 'BELT',
      gafas: 'GLASSES',
    }
    const s = String(raw).toLowerCase().trim()
    return map[s] || String(raw).replace(/_/g, ' ').toUpperCase()
  }

  const colorToEnglish = (raw) => {
    if (raw == null || raw === '') return ''
    const map = {
      desconocido: 'Unknown',
      negro: 'Black',
      blanco: 'White',
      gris: 'Gray',
      rojo: 'Red',
      azul: 'Blue',
      verde: 'Green',
      amarillo: 'Yellow',
      naranja: 'Orange',
      rosa: 'Pink',
      beige: 'Beige',
      marrón: 'Brown',
    }
    const s = String(raw).toLowerCase().trim()
    return map[s] || String(raw)
  }

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const liveTimerRef = useRef(null)
  const lastFrameRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [liveMode, setLiveMode] = useState(false)

  const [locationStatus, setLocationStatus] = useState('idle') // idle | asking | granted | denied | error
  const [locationLabel, setLocationLabel] = useState('')
  const [occasionId, setOccasionId] = useState('business-casual') // user choice for feedback context
  const event = useMemo(() => {
    const opt = OCCASION_OPTIONS.find((o) => o.id === occasionId)
    return opt ? opt.label : occasionId
  }, [occasionId])
  const [weather, setWeather] = useState('16°C')
  const [timeOfDay, setTimeOfDay] = useState('afternoon')
  const [stylePref, setStylePref] = useState('minimal smart casual')
  const [userNotes, setUserNotes] = useState('')

  const [userPrompt, setUserPrompt] = useState(DEFAULT_ADVANCED_PROMPT)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [vitLoading, setVitLoading] = useState(false)
  const [vitResult, setVitResult] = useState(null)
  const [addToWardrobeLoading, setAddToWardrobeLoading] = useState(false)

  const context = useMemo(() => {
    const ctx = {
      event,
      weather,
      time: timeOfDay,
      user_profile: { style_preference: stylePref }
    }
    if (locationLabel) ctx.location = locationLabel
    return ctx
  }, [event, weather, timeOfDay, stylePref, locationLabel])

  /**
   * Set time-of-day label from hour/minute (0–23, 0–59).
   * @param {number} hour - 0–23
   * @param {number} [minute=0] - 0–59
   */
  const setTimeFromHour = (hour, minute = 0) => {
    const h = Number.isNaN(hour) ? 12 : Math.max(0, Math.min(23, hour))
    const m = Number.isNaN(minute) ? 0 : Math.max(0, Math.min(59, minute))
    const period = h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
    const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setTimeOfDay(`${period}, ${timeLabel}`)
  }

  /** Request geolocation and fill weather/time via Open-Meteo. */
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.')
      setLocationStatus('error')
      return
    }
    setLocationStatus('asking')
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationStatus('granted')
        setLocationLabel(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`)
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,time`
          )
          if (!res.ok) throw new Error('API error')
          const data = await res.json()
          const current = data?.current ?? {}
          const temp = current.temperature_2m
          const code = current.weather_code ?? 0
          const weatherText = WEATHER_CODES[code] || 'clear'
          if (temp != null) setWeather(`${Math.round(temp)}°C, ${weatherText}`)
          else setWeather(weatherText)
          const timeStr = current.time
          if (timeStr && typeof timeStr === 'string') {
            const timePart = timeStr.split('T')[1] || ''
            const [h, min] = timePart.split(':').map((n) => parseInt(n, 10) || 0)
            setTimeFromHour(h, min)
          }
        } catch (_) {
          setWeather(`— (check connection)`)
          const now = new Date()
          setTimeFromHour(now.getHours(), now.getMinutes())
        }
      },
      () => {
        setLocationStatus('denied')
        setError('Location denied. Enter weather and time manually.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

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
    setLoading(true)
    try {
      const imageDataUrl = captureFrameDataUrl()
      if (!imageDataUrl) {
        throw new Error('Camera not ready yet. Wait a second and try again.')
      }
      lastFrameRef.current = imageDataUrl
      const { data } = await axios.post(
        '/api/mirror/analyze-frame',
        { imageDataUrl, context, userNotes: userNotes.trim() },
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
        confianza: typeof data.confianza === 'number' ? data.confianza : 0.5
      })
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message)
    } finally {
      setVitLoading(false)
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

  /** Run text-only analysis with userPrompt via /api/mirror/analyze. */
  const handleAnalyzeAdvancedText = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const { data } = await axios.post('/api/mirror/analyze', { userPrompt: userPrompt.trim() }, { timeout: 65000 })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
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
      if (!cameraOn || loading) return
      handleAnalyzeFrame()
    }, 4000)
    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current)
        liveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, cameraOn, loading])

  useEffect(() => {
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const analysis = result?.analysis
  const newItems = result?.new_detected_items ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="sw-heading text-[#0D0D0D] text-2xl font-semibold tracking-tight">Mirror</h1>
          <p className="text-sm text-[#888] mt-0.5">Get AI feedback on your outfit in real time</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera / Mirror block */}
          <section className="sw-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D0CEC8] flex items-center justify-between">
              <span className="text-sm font-medium text-[#888]">Camera</span>
              {!cameraOn ? (
                <button onClick={startCamera} disabled={cameraStarting} className="sw-btn sw-btn-accent sw-btn-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {cameraStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Start camera
                </button>
              ) : (
                <button onClick={stopCamera} className="sw-btn sw-btn-outline sw-btn-sm flex items-center gap-2 transition-colors">
                  <CameraOff className="h-4 w-4" /> Stop
                </button>
              )}
            </div>
            <div className="p-4">
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
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleAnalyzeFrame} disabled={!cameraOn || loading} className="sw-btn sw-btn-primary sw-btn-sm disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Evaluate outfit
                </button>
                <button onClick={handleClassifyVit} disabled={!cameraOn || vitLoading} className="sw-btn sw-btn-outline sw-btn-sm disabled:opacity-40 flex items-center gap-2 transition-colors">
                  {vitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Classify ViT
                </button>
                <button onClick={() => setLiveMode((v) => !v)} disabled={!cameraOn} className={`sw-btn sw-btn-sm flex items-center gap-2 transition-colors ${liveMode ? 'sw-btn-accent' : 'sw-btn-ghost'}`}>
                  <Zap className="h-4 w-4" /> Live {liveMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {vitResult && (
                <div className="mt-4 p-4 sw-card rounded-xl">
                  <p className="text-xs text-[#888] mb-1">Detected (ViT)</p>
                  <p className="text-base font-medium text-[#0D0D0D]">{vitResult.clase_nombre}</p>
                  <p className="text-sm text-[#888]">
                    {typeToEnglish(vitResult.tipo)} · {colorToEnglish(vitResult.color)} · {(vitResult.confianza * 100).toFixed(0)}%
                  </p>
                  <button onClick={handleAddToWardrobe} disabled={addToWardrobeLoading} className="mt-3 sw-btn sw-btn-accent sw-btn-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                    {addToWardrobeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    Add to wardrobe
                  </button>
                </div>
              )}
              <p className="mt-3 text-xs text-[#888]">Analysis uses OpenRouter + ViT. Items are only saved when you click Add to wardrobe.</p>
            </div>
          </section>

          {/* Context panel */}
          <section className="sw-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D0CEC8]">
              <span className="text-sm font-medium text-[#888]">Context</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Get feedback for</label>
                <p className="text-xs text-[#888] mb-2">Choose the look you want feedback on</p>
                <div className="flex flex-wrap gap-2">
                  {OCCASION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOccasionId(opt.id)}
                      className={`sw-chip ${occasionId === opt.id ? 'active' : ''}`}
                      style={{ fontSize: '0.55rem', padding: '7px 12px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Location</label>
                <div className="flex gap-2 flex-wrap items-center">
                  <button type="button" onClick={requestLocation} disabled={locationStatus === 'asking'} className="sw-btn sw-btn-outline sw-btn-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {locationStatus === 'asking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Weather & time
                  </button>
                  {locationLabel && <span className="text-sm text-[#888] truncate max-w-[140px]">{locationLabel}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Weather</label>
                  <input value={weather} onChange={(e) => setWeather(e.target.value)} className="sw-input" placeholder="e.g. 18°C" />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Time</label>
                  <input value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="sw-input" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Style</label>
                <input value={stylePref} onChange={(e) => setStylePref(e.target.value)} className="sw-input" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Notes</label>
                <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Optional" className="sw-input resize-none h-20" />
              </div>
              <button onClick={() => setShowAdvanced((v) => !v)} className="sw-btn sw-btn-ghost sw-btn-sm flex items-center gap-1">
                {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Advanced mode
              </button>
              {showAdvanced && (
                <div className="pt-2 border-t border-[#D0CEC8] space-y-2">
                  <label className="block text-xs text-[#888]">Text input</label>
                  <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} className="sw-input resize-none h-32 text-xs" spellCheck={false} />
                  <button onClick={handleAnalyzeAdvancedText} disabled={loading} className="sw-btn sw-btn-primary sw-btn-sm disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                    Evaluate text
                  </button>
                </div>
              )}
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
