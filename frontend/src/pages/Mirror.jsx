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

export default function Mirror() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const liveTimerRef = useRef(null)
  const lastFrameRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [liveMode, setLiveMode] = useState(false)

  const [locationStatus, setLocationStatus] = useState('idle') // idle | asking | granted | denied | error
  const [locationLabel, setLocationLabel] = useState('')
  const [event, setEvent] = useState('business casual meeting')
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

  useEffect(() => {
    let cancelled = false
    axios.get('/api/me/preferences').then((res) => {
      if (!cancelled && res.data?.style_preference) {
        setStylePref(res.data.style_preference)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const saveStylePreference = (value) => {
    axios.put('/api/me/preferences', { style_preference: value }).catch(() => {})
  }

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
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setCameraOn(true)
    } catch (err) {
      setError(err?.message || 'Could not open camera. Check browser permissions.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-white tracking-tight">FashionAI Mirror</h1>
          <p className="text-sm text-zinc-500 mt-0.5">AI + ViT outfit evaluation</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">Camera</span>
              {!cameraOn ? (
                <button onClick={startCamera} disabled={cameraStarting} className="text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded disabled:opacity-50 flex items-center gap-2">
                  {cameraStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Start
                </button>
              ) : (
                <button onClick={stopCamera} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded flex items-center gap-2">
                  <CameraOff className="h-4 w-4" /> Stop
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="aspect-video bg-zinc-900 rounded border border-zinc-800 overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleAnalyzeFrame} disabled={!cameraOn || loading} className="text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 px-3 py-2 rounded flex items-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Evaluate
                </button>
                <button onClick={handleClassifyVit} disabled={!cameraOn || vitLoading} className="text-sm font-medium bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-40 px-3 py-2 rounded flex items-center gap-2">
                  {vitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Classify ViT
                </button>
                <button onClick={() => setLiveMode((v) => !v)} disabled={!cameraOn} className={`text-sm font-medium px-3 py-2 rounded flex items-center gap-2 ${liveMode ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                  <Zap className="h-4 w-4" /> Live {liveMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {vitResult && (
                <div className="mt-4 p-4 rounded border border-zinc-700 bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 mb-1">Vision Transformer</p>
                  <p className="text-base font-medium text-white">{vitResult.clase_nombre}</p>
                  <p className="text-sm text-zinc-400">{vitResult.tipo} · {vitResult.color} · {(vitResult.confianza * 100).toFixed(0)}%</p>
                  <button onClick={handleAddToWardrobe} disabled={addToWardrobeLoading} className="mt-3 text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50">
                    {addToWardrobeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    Add to wardrobe
                  </button>
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500">OpenRouter + ViT. Nothing is saved until you add the item.</p>
            </div>
          </section>

          <section className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-400">Context</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Location</label>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={requestLocation} disabled={locationStatus === 'asking'} className="text-sm bg-zinc-800 text-zinc-200 hover:bg-zinc-700 px-3 py-2 rounded border border-zinc-700 disabled:opacity-50 flex items-center gap-2">
                    {locationStatus === 'asking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Weather & time
                  </button>
                  {locationLabel && <span className="text-sm text-zinc-500 self-center truncate max-w-[140px]">{locationLabel}</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Event</label>
                <input value={event} onChange={(e) => setEvent(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600" placeholder="e.g. business casual" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Weather</label>
                  <input value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600" placeholder="e.g. 18°C" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Time</label>
                  <input value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Style</label>
                <input value={stylePref} onChange={(e) => setStylePref(e.target.value)} onBlur={() => saveStylePreference(stylePref)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Optional" className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none" />
              </div>
              <button onClick={() => setShowAdvanced((v) => !v)} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Advanced mode
              </button>
              {showAdvanced && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <label className="block text-xs text-zinc-500">Text input</label>
                  <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none" spellCheck={false} />
                  <button onClick={handleAnalyzeAdvancedText} disabled={loading} className="text-sm bg-zinc-700 text-white hover:bg-zinc-600 px-3 py-2 rounded disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                    Evaluate text
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded border border-red-900/50 bg-red-950/30 text-red-200 text-sm" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            {analysis && (
              <section className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-sm font-medium text-zinc-400">Analysis</span>
                </div>
                <div className="p-5">
                  <div className="flex gap-8 mb-5">
                    <div>
                      <p className="text-3xl font-semibold text-white tabular-nums">{analysis.overall_score ?? '—'}<span className="text-lg font-normal text-zinc-500">/100</span></p>
                      <p className="text-xs text-zinc-500 mt-0.5">Score</p>
                    </div>
                    <div>
                      <p className="text-3xl font-semibold text-white tabular-nums">{analysis.confidence_score ?? '—'}<span className="text-lg font-normal text-zinc-500">/100</span></p>
                      <p className="text-xs text-zinc-500 mt-0.5">Confidence</p>
                    </div>
                  </div>
                  <dl className="space-y-3 text-sm">
                    {analysis.style_identity && <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2"><dt className="text-zinc-500">Style</dt><dd className="text-zinc-200 text-right">{analysis.style_identity}</dd></div>}
                    {analysis.silhouette_balance && <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2"><dt className="text-zinc-500">Silhouette</dt><dd className="text-zinc-200 text-right">{analysis.silhouette_balance}</dd></div>}
                    {analysis.color_analysis && (
                      <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
                        <dt className="text-zinc-500">Color</dt>
                        <dd className="text-zinc-200 text-right">
                          {[analysis.color_analysis.palette_type, analysis.color_analysis.contrast_level, analysis.color_analysis.harmony_score != null && `harmony ${analysis.color_analysis.harmony_score}`].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                    )}
                    {analysis.fit_evaluation && <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2"><dt className="text-zinc-500">Fit</dt><dd className="text-zinc-200 text-right">{analysis.fit_evaluation}</dd></div>}
                    {analysis.occasion_alignment && <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2"><dt className="text-zinc-500">Occasion</dt><dd className="text-zinc-200 text-right">{analysis.occasion_alignment}</dd></div>}
                    {analysis.seasonal_match && <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2"><dt className="text-zinc-500">Season</dt><dd className="text-zinc-200 text-right">{analysis.seasonal_match}</dd></div>}
                  </dl>
                  {analysis.expert_feedback && (
                    <div className="mt-5 pt-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-2">Feedback</p>
                      <p className="text-sm text-zinc-200 leading-relaxed">{analysis.expert_feedback}</p>
                    </div>
                  )}
                  {Array.isArray(analysis.upgrade_suggestions) && analysis.upgrade_suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-2">Suggestions</p>
                      <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                        {analysis.upgrade_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {newItems.length > 0 && (
              <section className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">Detected items</span>
                </div>
                <ul className="p-4 space-y-3">
                  {newItems.map((item, i) => (
                    <li key={i} className="py-2 border-b border-zinc-800 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-white">{item.name || 'Unnamed'}</p>
                      <p className="text-xs text-zinc-500">{item.category} · {item.primary_color}{item.style_category ? ` · ${item.style_category}` : ''}</p>
                      {item.recommend_add_to_database && <span className="text-xs text-emerald-500 mt-1 block">Recommended to add to wardrobe</span>}
                    </li>
                  ))}
                </ul>
                <p className="px-4 pb-4 text-xs text-zinc-500">Use Classify ViT + Add to wardrobe to save.</p>
              </section>
            )}

            <div>
              <button onClick={() => setShowRawJson((v) => !v)} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                {showRawJson ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                JSON
              </button>
              {showRawJson && <pre className="mt-2 p-4 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 text-xs overflow-auto max-h-80 font-mono">{JSON.stringify(result, null, 2)}</pre>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
