import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FaMagic, FaSave, FaTrash, FaCog, FaStar } from 'react-icons/fa'
import axios from 'axios'
import OutfitCard from '../components/OutfitCard'
import OutfitCardSkeleton from '../components/OutfitCardSkeleton'
import PreferenciasModal from '../components/PreferenciasModal'

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
  const [showSurpriseChoice, setShowSurpriseChoice] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetchOutfits()
    if (location.state?.recommendations) {
      setRecommendations(location.state.recommendations)
    }
  }, [location])

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

  const handleGenerate = async (preferencias) => {
    setError(null)
    setGenerating(true)
    const prefs = preferencias ?? lastPreferences ?? {}
    if (preferencias != null) setLastPreferences(preferencias)
    try {
      const params = new URLSearchParams()
      if (prefs.colores?.length) params.append('colores', JSON.stringify(prefs.colores))
      if (prefs.ocasion) params.append('ocasion', prefs.ocasion)
      if (prefs.estilo) params.append('estilo', prefs.estilo)
      if (prefs.incluirVestido) params.append('incluirVestido', 'true')
      if (prefs.topPreference && prefs.topPreference !== 'any') params.append('topPreference', prefs.topPreference)
      if (prefs.incluirAbrigo) params.append('incluirAbrigo', 'true')
      if (prefs.layeredTop) params.append('layeredTop', 'true')

      const url = `/api/outfits/recommend${params.toString() ? '?' + params : ''}`
      const response = await axios.get(url)
      setRecommendations(response.data)
    } catch (err) {
      console.error('Error generating outfits:', err)
      const msg = err.response?.data?.error || 'Could not generate outfits. Make sure you have at least one top, one bottom, and one pair of shoes.'
      setError(msg)
      setRecommendations([])
    } finally {
      setGenerating(false)
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
    <div className="min-h-screen" style={{ background: 'var(--content-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">
            My Outfits
          </h1>
          <p className="text-slate-400">
            Get outfit ideas from your wardrobe. Use preferences to match occasion and style.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 bg-slate-600/80 rounded-xl w-fit mb-8 border border-slate-500">
          <button
            type="button"
            onClick={() => setActiveTab('recomendaciones')}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'recomendaciones'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-slate-500/50'
            }`}
          >
            Recommendations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guardados')}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'guardados'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-slate-500/50'
            }`}
          >
            Saved
            {outfits.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-500 text-white rounded-full">
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
              className="flex-1 min-w-[180px] bg-white text-slate-900 px-6 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaStar className="text-slate-600" />
              <span>Surprise Me</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreferencias(true)}
              className="bg-slate-600 text-slate-100 px-6 py-4 rounded-xl font-medium hover:bg-slate-500 border-2 border-slate-500 flex items-center gap-2"
            >
              <FaCog />
              <span>Preferences</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(lastPreferences ?? {})}
              disabled={generating}
              className="bg-slate-500 text-white px-6 py-4 rounded-xl font-medium hover:bg-slate-400 border-2 border-slate-400 disabled:opacity-60 flex items-center gap-2"
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
        />

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
                <p className="text-slate-400 mb-6 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Your recommendations</h2>
                  <span className="text-sm text-slate-400">{recommendations.length} outfit{recommendations.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((outfit, index) => (
                    <div
                      key={index}
                      className="animate-fade-in dashboard-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
                      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
                    >
                      <OutfitCard outfit={outfit} />
                      <div className="p-4 border-t border-slate-600 bg-slate-700/30">
                        <button
                          type="button"
                          onClick={() => handleSaveOutfit(outfit)}
                          className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            savedId === [outfit.superior._id, outfit.superiorSecundario?._id, outfit.inferior._id, outfit.zapatos._id, outfit.abrigo?._id].filter(Boolean).join('-')
                              ? 'bg-slate-600 text-white'
                              : 'bg-white text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <FaSave />
                          <span>{savedId === [outfit.superior._id, outfit.superiorSecundario?._id, outfit.inferior._id, outfit.zapatos._id, outfit.abrigo?._id].filter(Boolean).join('-') ? 'Saved!' : 'Save outfit'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="dashboard-card text-center py-20 px-6 rounded-2xl border border-slate-500 shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-600 flex items-center justify-center">
                  <FaMagic className="text-4xl text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">No recommendations yet</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  Click <strong>Surprise Me</strong> to get three outfit ideas, or set <strong>Preferences</strong> for occasion and style.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurpriseChoice(true)}
                  disabled={generating}
                  className="bg-white text-slate-900 px-8 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
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
              <div className="dashboard-card text-center py-20 px-6 rounded-2xl border border-slate-500 shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-600 flex items-center justify-center">
                  <FaSave className="text-4xl text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">No saved outfits</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Save outfits you like from the Recommendations tab to find them here.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-100">Saved outfits</h2>
                  <span className="text-sm text-slate-400">{outfits.length} outfit{outfits.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {outfits.map((outfit) => (
                    <div
                      key={outfit._id}
                      className="dashboard-card rounded-2xl border border-slate-500 overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
                    >
                      <OutfitCard outfit={outfit} onDelete={fetchOutfits} />
                      <div className="p-4 border-t border-slate-600 bg-slate-700/30">
                        <button
                          type="button"
                          onClick={() => handleDelete(outfit._id)}
                          className="w-full py-3 rounded-xl font-medium text-red-200 bg-red-900/40 border border-red-500/60 hover:bg-red-800/50 flex items-center justify-center gap-2 transition-colors"
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
