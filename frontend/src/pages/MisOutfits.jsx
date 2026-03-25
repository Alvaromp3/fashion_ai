import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { FaMagic, FaCog } from 'react-icons/fa'
import axios from 'axios'
import PreferenciasModal from '../components/PreferenciasModal'
import SavedOutfitGridCard from '../components/SavedOutfitGridCard'
import { buildSaveOutfitPayload, getComboKey } from '../utils/outfitHelpers'
import { outfitRecommendUrl } from '../lib/outfitRecommendQuery'

const RECS_STORAGE_KEY = 'fashion-ai-generate-recs'

function loadRecsFromStorage() {
  try {
    const raw = sessionStorage.getItem(RECS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const MisOutfits = () => {
  const [recommendations, setRecommendations] = useState(loadRecsFromStorage)
  const [generating, setGenerating] = useState(false)
  const [showPreferencias, setShowPreferencias] = useState(false)
  const [error, setError] = useState(null)
  const [lastPreferences, setLastPreferences] = useState(null)
  const [savedPreferences, setSavedPreferences] = useState(null)
  const [savingOutfitIndex, setSavingOutfitIndex] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Quitar ?outfit= de la URL para no confundir (solo generamos imagen, no enlace)
  useEffect(() => {
    if (location.pathname === '/generate' && location.search) {
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    try {
      sessionStorage.setItem(RECS_STORAGE_KEY, JSON.stringify(recommendations))
    } catch (e) {
      /* ignore */
    }
  }, [recommendations])

  useEffect(() => {
    fetchPreferences()
    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations)
    }
  }, [location])

  const fetchPreferences = async () => {
    try {
      const res = await axios.get('/api/me/preferences')
      setSavedPreferences(res.data)
    } catch {
      setSavedPreferences(null)
    }
  }

  const savePreferences = async (prefs) => {
    try {
      await axios.put('/api/me/preferences', prefs)
      setSavedPreferences(prefs)
    } catch (e) {
      console.error('Error saving preferences:', e)
    }
  }

  const handleGenerate = async (preferencias, append = false, excludeKeys = []) => {
    setError(null)
    setGenerating(true)
    const prefs = preferencias ?? lastPreferences ?? {}
    if (preferencias != null) {
      setLastPreferences(preferencias)
      savePreferences(preferencias)
    }
    try {
      const url = outfitRecommendUrl(prefs, excludeKeys)
      const response = await axios.get(url)
      setRecommendations(append ? (prev => [...prev, ...response.data]) : response.data)
    } catch (err) {
      console.error('Error generating outfits:', err)
      const msg = err.response?.data?.error || 'Could not generate outfits. Make sure you have at least one top, one bottom, and one pair of shoes.'
      setError(msg)
      if (!append) setRecommendations([])
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateRef = useRef(handleGenerate)
  handleGenerateRef.current = handleGenerate

  useEffect(() => {
    const chatPrefs = location.state?.chatPreferences
    if (!chatPrefs || typeof chatPrefs !== 'object') return
    navigate(location.pathname, { replace: true, state: {} })
    void handleGenerateRef.current(chatPrefs)
  }, [location.pathname, navigate, location.state?.chatPreferences])

  const saveRecommendationToWardrobe = useCallback(async (outfit, listIndex) => {
    const body = buildSaveOutfitPayload(outfit)
    if (!body) {
      window.alert('This outfit is missing garments and cannot be saved.')
      return
    }
    setSavingOutfitIndex(listIndex)
    try {
      await axios.post('/api/outfits/save', body)
      const ck = getComboKey(outfit)
      setRecommendations((prev) => (ck ? prev.filter((o) => getComboKey(o) !== ck) : prev))
      try {
        const raw = sessionStorage.getItem(RECS_STORAGE_KEY)
        const list = raw ? JSON.parse(raw) : []
        const next = ck ? list.filter((o) => getComboKey(o) !== ck) : list
        sessionStorage.setItem(RECS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Error saving outfit:', err)
      const msg = err.response?.data?.error || 'Could not save the outfit. Try again.'
      window.alert(msg)
    } finally {
      setSavingOutfitIndex(null)
    }
  }, [])

  const sortedRecommendations = useMemo(() => {
    const tuples = recommendations.map((o, i) => ({ outfit: o, index: i }))
    tuples.sort((a, b) => (b.outfit.puntuacion ?? 0) - (a.outfit.puntuacion ?? 0))
    return tuples
  }, [recommendations])

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-10">
        <div className="mb-8 sm:mb-10">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0D0D0D] tracking-tight sw-heading min-w-0">
              Generate
            </h1>
            <button
              type="button"
              onClick={() => setShowPreferencias(true)}
              className="shrink-0 -mr-1 p-2.5 rounded-xl text-[#888] hover:text-[#0D0D0D] hover:bg-black/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B00]/40"
              aria-label="Outfit preferences"
            >
              <FaCog className="text-xl sm:text-2xl" />
            </button>
          </div>
          <p className="text-sm text-[#888] max-w-2xl">
            Get outfit ideas from your wardrobe. <strong>Save to wardrobe</strong> keeps the ones you like in{' '}
            <Link to="/wardrobe/outfits" className="text-[#0D0D0D] underline underline-offset-2 hover:text-[#FF3B00]">
              Saved outfits
            </Link>
            ; open that page to remove any you no longer want.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap mb-8">
          <div className="flex w-full sm:w-auto items-stretch gap-2">
            <button
              type="button"
              onClick={() => handleGenerate(lastPreferences ?? savedPreferences ?? {})}
              disabled={generating}
              className="min-w-0 flex-1 sm:flex-initial sm:w-auto sw-btn sw-btn-primary sw-btn-lg justify-center"
            >
              <FaMagic />
              <span>Generate</span>
            </button>
            <Link
              to="/chat"
              className="shrink-0 inline-flex items-center justify-center sw-btn sw-btn-outline sw-btn-lg min-w-[3.25rem] px-3 no-underline"
              aria-label="Wardrobe chat"
            >
              <Bot size={25} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>

        <PreferenciasModal
          isOpen={showPreferencias}
          onClose={() => setShowPreferencias(false)}
          onGenerate={handleGenerate}
          initialPreferences={savedPreferences}
          onSave={savePreferences}
        />

        {/* Recommendations — same grid cards as /wardrobe/outfits */}
        <section className="border-t border-[#0D0D0D] pt-10 mt-2">
          <div className="mb-8 border-b border-[#0D0D0D] pb-4">
            <p className="sw-label text-[#FF3B00] mb-1">— AI SUGGESTIONS</p>
            <h2 className="sw-heading text-[#0D0D0D]" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
              Recommendations
            </h2>
          </div>
          <div>
            {error && (
              <div className="sw-card mb-6 p-4 rounded-2xl border border-[#FF3B00] text-[#FF3B00] text-sm">
                {error}
              </div>
            )}

            {generating ? (
              <div>
                <p className="sw-label text-[#888] mb-6 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#FF3B00] animate-pulse" />
                  Combining your pieces…
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="sw-card rounded-2xl overflow-hidden border border-[#D0CEC8] animate-pulse"
                    >
                      <div className="p-2 bg-[#fafaf9]">
                        <div className="grid grid-cols-2 gap-1.5 aspect-square w-full">
                          {[0, 1, 2, 3].map((j) => (
                            <div key={j} className="rounded-lg bg-[#E8E6E0]" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <div>
                <p className="text-sm text-[#888] mb-6">
                  {recommendations.length} outfit{recommendations.length !== 1 ? 's' : ''}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sortedRecommendations.map(({ outfit, index: realIndex }, index) => (
                    <div
                      key={realIndex}
                      className="anim-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <SavedOutfitGridCard
                        outfit={outfit}
                        saveToWardrobeLoading={savingOutfitIndex === realIndex}
                        onSaveToWardrobe={() => saveRecommendationToWardrobe(outfit, realIndex)}
                        onOpen={() => navigate('/generate/outfit', { state: { outfit } })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sw-card text-center py-20 px-6 rounded-2xl border-[#D0CEC8] shadow-sm mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#D0CEC8] flex items-center justify-center">
                  <FaMagic className="text-4xl text-[#0D0D0D]" />
                </div>
                <h3 className="text-xl font-semibold text-[#0D0D0D] mb-2">No recommendations yet</h3>
                <p className="text-[#888] max-w-md mx-auto mb-8">
                  Open <strong>Preferences</strong> (gear icon) to choose 3 or 4 pieces, occasion, and style, then tap <strong>Generate</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPreferencias(true)}
                    className="sw-btn sw-btn-outline sw-btn-lg inline-flex items-center justify-center gap-2"
                  >
                    <FaCog />
                    Preferences
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate(lastPreferences ?? savedPreferences ?? {})}
                    disabled={generating}
                    className="sw-btn sw-btn-primary sw-btn-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <FaMagic />
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default MisOutfits
