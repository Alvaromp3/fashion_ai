import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaMagic, FaSave, FaTrash, FaCog, FaStar, FaHeart, FaShareAlt, FaBalanceScale } from 'react-icons/fa'
import html2canvas from 'html2canvas'
import axios from 'axios'
import OutfitCard from '../components/OutfitCard'
import OutfitCardSkeleton from '../components/OutfitCardSkeleton'
import PreferenciasModal from '../components/PreferenciasModal'
import PrendaModal from '../components/PrendaModal'
import CompareOutfitsModal from '../components/CompareOutfitsModal'

const FAVORITES_KEY = 'fashion-ai-outfit-favorites'

const getOutfitId = (outfit) =>
  [outfit.superior?._id, outfit.superiorSecundario?._id, outfit.inferior?._id, outfit.zapatos?._id, outfit.abrigo?._id]
    .filter(Boolean).join('-')

const getComboKey = (outfit) => {
  const s = outfit.superior?._id
  const s2 = outfit.superiorSecundario?._id
  const i = outfit.inferior?._id
  const z = outfit.zapatos?._id
  if (!s || !i || !z) return ''
  return s2 ? `${s}-${s2}-${i}-${z}` : `${s}-${i}-${z}`
}

const MisOutfits = () => {
  const [outfits, setOutfits] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showPreferencias, setShowPreferencias] = useState(false)
  const [activeTab, setActiveTab] = useState('recomendaciones')
  const [savedId, setSavedId] = useState(null)
  const [error, setError] = useState(null)
  const [lastPreferences, setLastPreferences] = useState(null)
  const [savedPreferences, setSavedPreferences] = useState(null)
  const [showSurpriseChoice, setShowSurpriseChoice] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState(null)
  const [compareSelection, setCompareSelection] = useState([])
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [filterFavoritos, setFilterFavoritos] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const featuredCardRef = useRef(null)
  const cardRefs = useRef({})
  const location = useLocation()
  const navigate = useNavigate()

  // Quitar ?outfit= de la URL para no confundir (solo generamos imagen, no enlace)
  useEffect(() => {
    if (location.pathname === '/outfits' && location.search) {
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const toggleFavorite = useCallback((outfitId) => {
    setFavorites(prev => {
      const next = prev.includes(outfitId) ? prev.filter(id => id !== outfitId) : [...prev, outfitId]
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)) } catch (e) {}
      return next
    })
  }, [])

  const toggleCompare = useCallback((index) => {
    setCompareSelection(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      if (prev.length >= 2) return [prev[1], index]
      return [...prev, index]
    })
  }, [])

  useEffect(() => {
    fetchOutfits()
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

  const fetchOutfits = async () => {
    try {
      const response = await axios.get('/api/outfits')
      setOutfits(response.data)
    } catch (err) {
      console.error('Error fetching outfits:', err)
    } finally {
      setLoading(false)
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
      const params = new URLSearchParams()
      if (prefs.colores?.length) params.append('colores', JSON.stringify(prefs.colores))
      if (prefs.ocasion) params.append('ocasion', prefs.ocasion)
      if (prefs.estilo) params.append('estilo', prefs.estilo)
      if (prefs.incluirVestido) params.append('incluirVestido', 'true')
      if (prefs.topPreference && prefs.topPreference !== 'any') params.append('topPreference', prefs.topPreference)
      if (prefs.incluirAbrigo) params.append('incluirAbrigo', 'true')
      if (prefs.layeredTop) params.append('layeredTop', 'true')
      if (excludeKeys.length) params.append('exclude', excludeKeys.join(','))

      const url = `/api/outfits/recommend${params.toString() ? '?' + params : ''}`
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

  const handleGenerateMore = () => {
    const keys = recommendations.map(getComboKey).filter(Boolean)
    handleGenerate(lastPreferences ?? {}, true, keys)
  }

  const visibleRecs = useMemo(() => {
    const tuples = recommendations.map((o, i) => ({ outfit: o, index: i }))
    if (!filterFavoritos) return tuples
    return tuples.filter(({ outfit }) => favorites.includes(getOutfitId(outfit)))
  }, [recommendations, filterFavoritos, favorites])

  const featured = useMemo(() => {
    if (filterFavoritos || recommendations.length === 0) return null
    let bestIdx = 0
    let bestScore = -Infinity
    for (let i = 0; i < recommendations.length; i++) {
      const score = recommendations[i]?.puntuacion ?? -Infinity
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    return { outfit: recommendations[bestIdx], index: bestIdx }
  }, [recommendations, filterFavoritos])

  const handleShare = async (outfit, index, elementFromClick) => {
    const el = elementFromClick ?? cardRefs.current[index]
    if (!el) {
      setShareFeedback('error')
      setTimeout(() => setShareFeedback(null), 3000)
      return
    }
    setShareLoading(true)
    setShareFeedback(null)
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1e293b',
        logging: false,
        allowTaint: true,
        imageTimeout: 0
      })
      canvas.toBlob((blob) => {
        if (!blob) {
          setShareLoading(false)
          setShareFeedback('error')
          setTimeout(() => setShareFeedback(null), 3000)
          return
        }
        const fileName = `outfit-fashion-ai-${index + 1}.jpg`
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)

        const tryShare = () => {
          if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file], title: 'Outfit Fashion AI', text: 'Recommended outfit' }).then(() => true).catch(() => false)
          }
          return Promise.resolve(false)
        }

        tryShare().then((shared) => {
          if (!shared) {
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.rel = 'noopener'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }
          URL.revokeObjectURL(url)
          setShareFeedback(index)
          setShareLoading(false)
          setTimeout(() => setShareFeedback(null), 3000)
        })
      }, 'image/jpeg', 0.9)
    } catch (err) {
      console.error('Error generating share image:', err)
      setShareLoading(false)
      setShareFeedback('error')
      setTimeout(() => setShareFeedback(null), 3000)
    }
  }

  const handleSaveOutfit = async (outfit) => {
    try {
      const body = {
        superior_id: outfit.superior._id,
        inferior_id: outfit.inferior._id,
        zapatos_id: outfit.zapatos._id,
        puntuacion: outfit.puntuacion
      }
      if (outfit.superiorSecundario?._id) body.superior_secundario_id = outfit.superiorSecundario._id
      if (outfit.abrigo?._id) body.abrigo_id = outfit.abrigo._id
      await axios.post('/api/outfits/save', body)
      setSavedId([outfit.superior._id, outfit.superiorSecundario?._id, outfit.inferior._id, outfit.zapatos._id, outfit.abrigo?._id].filter(Boolean).join('-'))
      setRecommendations(recommendations.filter((o) => o !== outfit))
      fetchOutfits()
      setTimeout(() => setSavedId(null), 2000)
    } catch (err) {
      console.error('Error saving outfit:', err)
      alert('Error saving the outfit')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/outfits/${id}`)
      fetchOutfits()
    } catch (err) {
      console.error('Error deleting outfit:', err)
      alert('Error deleting the outfit')
    }
  }

  return (
    <div className="min-h-screen sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#0D0D0D] mb-2 tracking-tight sw-heading">
            My Outfits
          </h1>
          <p className="text-sm text-[#888]">
            Get outfit ideas from your wardrobe. Use preferences to match occasion and style.
          </p>
        </div>

        {/* Tabs */}
        <div className="sw-tabs w-fit mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('recomendaciones')}
            className={`sw-tab ${activeTab === 'recomendaciones' ? 'active' : ''}`}
          >
            Recommendations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guardados')}
            className={`sw-tab ${activeTab === 'guardados' ? 'active' : ''}`}
          >
            Saved
            {outfits.length > 0 && (
              <span className="sw-badge sw-badge-solid" style={{ marginLeft: 10 }}>
                {outfits.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'recomendaciones' && (
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              type="button"
              onClick={() => setShowSurpriseChoice(true)}
              disabled={generating}
              className="flex-1 min-w-[180px] sw-btn sw-btn-outline sw-btn-lg"
            >
              <FaStar />
              <span>Surprise Me</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreferencias(true)}
              className="sw-btn sw-btn-ghost sw-btn-lg"
            >
              <FaCog />
              <span>Preferences</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(lastPreferences ?? {})}
              disabled={generating}
              className="sw-btn sw-btn-primary sw-btn-lg"
            >
              <FaMagic />
              <span>Generate</span>
            </button>
          </div>
        )}

        <PreferenciasModal
          isOpen={showPreferencias}
          onClose={() => setShowPreferencias(false)}
          onGenerate={handleGenerate}
          initialPreferences={savedPreferences}
          onSave={savePreferences}
        />

        {selectedPrenda && (
          <PrendaModal
            prenda={selectedPrenda.prenda}
            label={selectedPrenda.label}
            onClose={() => setSelectedPrenda(null)}
          />
        )}

        {compareSelection.length === 2 && recommendations[compareSelection[0]] && recommendations[compareSelection[1]] && (
          <CompareOutfitsModal
            outfitA={recommendations[compareSelection[0]]}
            outfitB={recommendations[compareSelection[1]]}
            onClose={() => setCompareSelection([])}
          />
        )}

        {showSurpriseChoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Surprise Me</h3>
              <p className="text-slate-500 text-sm mb-4">Choose outfit type to generate 3 random suggestions.</p>
              <div className="flex flex-col gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    handleGenerate({ layeredTop: false })
                    setShowSurpriseChoice(false)
                  }}
                  disabled={generating}
                  className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left text-sm font-medium text-slate-800 disabled:opacity-60"
                >
                  3 pieces — T-shirt + trousers + sneakers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleGenerate({ layeredTop: true })
                    setShowSurpriseChoice(false)
                  }}
                  disabled={generating}
                  className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left text-sm font-medium text-slate-800 disabled:opacity-60"
                >
                  4 pieces — Pullover + T-shirt + trousers + sneakers
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSurpriseChoice(false)}
                className="w-full py-2.5 text-slate-500 text-sm font-medium hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recommendations tab */}
        {activeTab === 'recomendaciones' && (
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            {generating ? (
              <div>
                <p className="text-[#888] mb-6 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#888] animate-pulse" />
                  Combining your pieces…
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <OutfitCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold text-[#0D0D0D]">Your recommendations</h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFilterFavoritos(f => !f)}
                      className={`sw-btn sw-btn-ghost sw-btn-sm flex items-center gap-2 ${filterFavoritos ? 'sw-btn-accent' : ''}`}
                    >
                      <FaHeart className="text-sm" />
                      Favorites
                    </button>
                    <span className="text-sm text-[#888]">{recommendations.length} outfit{recommendations.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Look del día: outfit con mayor puntuación destacado */}
                {!filterFavoritos && featured?.outfit && (() => {
                  const outfitIdFeatured = getOutfitId(featured.outfit)
                  const isJustSavedFeat = savedId === outfitIdFeatured
                  return (
                    <div className="mb-8 animate-fade-in">
                      <p className="text-sm font-medium text-[#888] mb-3 uppercase tracking-wide">Recommendation of the day</p>
                      <div ref={featuredCardRef} data-outfit-card className="sw-card rounded-2xl border-2 border-[#D0CEC8] overflow-hidden shadow-sm">
                        <OutfitCard outfit={featured.outfit} onPrendaClick={(prenda, label) => setSelectedPrenda({ prenda, label })} showPuntuacion showPorQueCombina />
                        <div className="p-5 border-t border-[#D0CEC8] bg-white flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveOutfit(featured.outfit)}
                            className={`flex-1 min-w-[140px] sw-btn sw-btn-sm flex items-center justify-center gap-2 ${isJustSavedFeat ? 'sw-btn-outline' : 'sw-btn-primary'}`}
                          >
                            {isJustSavedFeat ? 'Saved' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              const card = e.currentTarget.closest('[data-outfit-card]')
                              handleShare(featured.outfit, featured.index, card)
                            }}
                            disabled={shareLoading}
                            className="sw-btn sw-btn-outline sw-btn-sm flex items-center gap-2 disabled:opacity-70"
                          >
                            <FaShareAlt /> {shareFeedback === featured.index ? 'Downloaded!' : shareLoading ? 'Generating…' : 'Share image'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {filterFavoritos && favorites.filter(id => recommendations.some(o => getOutfitId(o) === id)).length === 0 && (
                  <p className="text-slate-400 mb-4">You don’t have favorites yet. Tap the heart on a recommendation.</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleRecs.map(({ outfit, index: realIndex }, index) => {
                      const outfitId = getOutfitId(outfit)
                      const isJustSaved = savedId === outfitId
                      const isFavorite = favorites.includes(outfitId)
                      const isCompareSelected = compareSelection.includes(realIndex)
                      return (
                        <div
                          key={realIndex}
                          ref={(el) => { cardRefs.current[realIndex] = el }}
                          data-outfit-card
                          className="relative animate-fade-in sw-card rounded-2xl border-[#D0CEC8] overflow-hidden shadow-sm"
                          style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
                        >
                          <div className="absolute top-3 right-3 z-10 flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCompare(realIndex)}
                              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors ${isCompareSelected ? 'border-[#FF3B00] text-[#0D0D0D]' : 'border-[#D0CEC8] bg-white text-[#888]'}`}
                              title="Compare"
                            >
                              <FaBalanceScale className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(outfitId)}
                              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors ${isFavorite ? 'border-[#FF3B00] text-[#0D0D0D]' : 'border-[#D0CEC8] bg-white text-[#888]'}`}
                              title={isFavorite ? 'Remove favorite' : 'Add to favorites'}
                            >
                              <FaHeart className={isFavorite ? 'fill-current' : ''} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                const card = e.currentTarget.closest('[data-outfit-card]')
                                handleShare(outfit, realIndex, card)
                              }}
                              disabled={shareLoading}
                              className="w-10 h-10 border border-[#D0CEC8] rounded-xl flex items-center justify-center text-[#888] hover:text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors disabled:opacity-70 bg-white"
                              title="Download outfit image"
                            >
                              <FaShareAlt className="text-sm" />
                            </button>
                          </div>
                          <OutfitCard
                            outfit={outfit}
                            onPrendaClick={(prenda, label) => setSelectedPrenda({ prenda, label })}
                            showPuntuacion
                            showPorQueCombina
                          />
                          <div className="p-5 border-t border-[#D0CEC8] bg-white">
                            <button
                              type="button"
                              onClick={() => handleSaveOutfit(outfit)}
                              className={`w-full sw-btn sw-btn-sm flex items-center justify-center gap-2.5 ${isJustSaved ? 'sw-btn-outline' : 'sw-btn-primary'}`}
                            >
                              <span>{isJustSaved ? 'Saved' : 'Save outfit'}</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {recommendations.length > 0 && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={handleGenerateMore}
                      disabled={generating}
                      className="sw-btn sw-btn-outline sw-btn-lg disabled:opacity-60 flex items-center gap-2"
                    >
                      <FaMagic />
                      I’ve seen these; generate 3 more
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="sw-card text-center py-20 px-6 rounded-2xl border-[#D0CEC8] shadow-sm mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#D0CEC8] flex items-center justify-center">
                  <FaMagic className="text-4xl text-[#0D0D0D]" />
                </div>
                <h3 className="text-xl font-semibold text-[#0D0D0D] mb-2">No recommendations yet</h3>
                <p className="text-[#888] max-w-md mx-auto mb-8">
                  Click <strong>Surprise Me</strong> to get three outfit ideas, or set <strong>Preferences</strong> for occasion and style.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurpriseChoice(true)}
                  disabled={generating}
                  className="sw-btn sw-btn-outline sw-btn-lg disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <FaStar />
                  Surprise Me
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saved tab */}
        {activeTab === 'guardados' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin" />
              </div>
            ) : outfits.length === 0 ? (
              <div className="sw-card text-center py-20 px-6 rounded-2xl border-[#D0CEC8] shadow-sm mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#D0CEC8] flex items-center justify-center">
                  <FaSave className="text-4xl text-[#0D0D0D]" />
                </div>
                <h3 className="text-xl font-semibold text-[#0D0D0D] mb-2">No saved outfits</h3>
                <p className="text-[#888] max-w-md mx-auto">
                  Save outfits you like from the Recommendations tab to find them here.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#0D0D0D]">Saved outfits</h2>
                  <span className="text-sm text-[#888]">{outfits.length} outfit{outfits.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {outfits.map((outfit) => (
                    <div
                      key={outfit._id}
                      className="sw-card rounded-2xl border-[#D0CEC8] overflow-hidden shadow-sm"
                    >
                      <OutfitCard outfit={outfit} onDelete={fetchOutfits} onPrendaClick={(prenda, label) => setSelectedPrenda({ prenda, label })} />
                      <div className="p-5 border-t border-[#D0CEC8] bg-white">
                        <button
                          type="button"
                          onClick={() => handleDelete(outfit._id)}
                          className="w-full sw-btn sw-btn-ghost sw-btn-sm flex items-center justify-center gap-2"
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MisOutfits
