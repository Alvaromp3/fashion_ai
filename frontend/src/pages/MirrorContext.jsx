import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  ScanLine
} from 'lucide-react'
import { OCCASION_OPTIONS } from '../lib/mirrorConstants'
import { loadMirrorContext, saveMirrorContext } from '../lib/mirrorContextStorage'
import { buildMirrorWeatherPartialFromCoords, GEO_OPTIONS_DEFAULT } from '../lib/mirrorWeather'

export default function MirrorContext() {
  const navigate = useNavigate()
  const initial = useMemo(() => loadMirrorContext(), [])

  const [occasionId, setOccasionId] = useState(initial.occasionId)
  const [weather, setWeather] = useState(initial.weather)
  const [timeOfDay, setTimeOfDay] = useState(initial.timeOfDay)
  const [stylePref, setStylePref] = useState(initial.stylePref)
  const [userNotes, setUserNotes] = useState(initial.userNotes)
  const [locationLabel, setLocationLabel] = useState(initial.locationLabel)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [userPrompt, setUserPrompt] = useState(initial.userPrompt)
  const [showAdvanced, setShowAdvanced] = useState(initial.showAdvanced)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
        try {
          const partial = await buildMirrorWeatherPartialFromCoords(latitude, longitude)
          setWeather(partial.weather)
          setTimeOfDay(partial.timeOfDay)
          setLocationLabel(partial.locationLabel)
        } catch (_) {
          setLocationStatus('error')
          setError('Could not load weather. Try again or enter manually.')
        }
      },
      () => {
        setLocationStatus('denied')
        setError('Location denied. Enter weather and time manually.')
      },
      GEO_OPTIONS_DEFAULT
    )
  }

  const persistAndBack = () => {
    saveMirrorContext({
      occasionId,
      weather,
      timeOfDay,
      stylePref,
      userNotes,
      locationLabel,
      userPrompt,
      showAdvanced
    })
    navigate('/mirror')
  }

  const handleAnalyzeAdvancedText = async () => {
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.post('/api/mirror/analyze', { userPrompt: userPrompt.trim() }, { timeout: 65000 })
      saveMirrorContext({
        occasionId,
        weather,
        timeOfDay,
        stylePref,
        userNotes,
        locationLabel,
        userPrompt,
        showAdvanced
      })
      navigate('/mirror', { state: { mirrorResult: data } })
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-lg mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-10 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))]">
        <div className="mb-8">
          <Link
            to="/mirror"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#888] hover:text-[#0D0D0D] mb-6 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Mirror
          </Link>
          <h1 className="sw-heading text-[#0D0D0D] text-2xl font-semibold tracking-tight">Mirror context</h1>
          <p className="text-sm text-[#888] mt-2">
            Set occasion, weather, and notes. This is sent with “Evaluate outfit” on the camera screen.
          </p>
        </div>

        <div className="sw-card rounded-2xl border border-[#D0CEC8] overflow-hidden">
          <div className="p-4 sm:p-5 space-y-5">
            {error && (
              <div className="p-3 rounded-xl border border-[#FF3B00] bg-red-50 text-sm text-red-900" role="alert">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#888] mb-1">Get feedback for</label>
              <p className="text-xs text-[#888] mb-2">Choose the look you want feedback on</p>
              <div className="flex flex-wrap gap-2 max-h-[min(40vh,280px)] overflow-y-auto scrollbar-touch pr-1">
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
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locationStatus === 'asking'}
                  className="sw-btn sw-btn-outline sw-btn-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {locationStatus === 'asking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Weather & time
                </button>
                {locationLabel && (
                  <span className="text-sm text-[#888] truncate max-w-[min(200px,50vw)]">{locationLabel}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Optional" className="sw-input resize-none h-24" />
            </div>

            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="sw-btn sw-btn-ghost sw-btn-sm flex items-center gap-1">
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Advanced mode
            </button>
            {showAdvanced && (
              <div className="pt-2 border-t border-[#D0CEC8] space-y-2">
                <label className="block text-xs text-[#888]">Text-only analysis prompt</label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="sw-input resize-none h-36 text-xs"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handleAnalyzeAdvancedText}
                  disabled={loading}
                  className="sw-btn sw-btn-outline sw-btn-sm disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  Evaluate text — go to Mirror
                </button>
                <p className="text-xs text-[#888]">Runs analysis without the camera and returns you to Mirror with results.</p>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5 py-4 border-t border-[#D0CEC8] bg-[#F5F4F0] flex flex-col sm:flex-row gap-3 sm:justify-end pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <Link to="/mirror" className="sw-btn sw-btn-ghost sw-btn-sm justify-center text-center">
              Cancel
            </Link>
            <button type="button" onClick={persistAndBack} className="sw-btn sw-btn-primary sw-btn-sm justify-center">
              Save and return to Mirror
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
