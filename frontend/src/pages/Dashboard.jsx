import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMagic, FaTshirt, FaArrowRight, FaUpload } from 'react-icons/fa'
import { ScanLine } from 'lucide-react'
import axios from 'axios'
import PrendaCard from '../components/PrendaCard'
import OutfitCard from '../components/OutfitCard'
import UploadModal from '../components/UploadModal'

const Dashboard = () => {
  const [prendas, setPrendas] = useState([])
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const healthRes = await axios.get('/api/health', { timeout: 4000 }).catch(() => null)
        if (cancelled) return
        if (!healthRes || !healthRes.data) {
          setLoading(false)
          return
        }
        const [prendasRes, outfitsRes] = await Promise.all([
          axios.get('/api/prendas', { timeout: 15000 }).catch(() => ({ data: [] })),
          axios.get('/api/outfits', { timeout: 15000 }).catch(() => ({ data: [] }))
        ])
        if (cancelled) return
        setPrendas(Array.isArray(prendasRes?.data) ? prendasRes.data.slice(0, 6) : [])
        setOutfits(Array.isArray(outfitsRes?.data) ? outfitsRes.data.slice(0, 3) : [])
      } catch (e) {
        if (!cancelled) console.error('Dashboard fetch error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const fetchPrendas = async () => {
    try {
      const response = await axios.get('/api/prendas', { timeout: 15000 })
      setPrendas(Array.isArray(response.data) ? response.data.slice(0, 6) : [])
    } catch (error) {
      console.error('Error fetching garments:', error)
      setPrendas([])
    }
  }

  const fetchOutfits = async () => {
    try {
      const response = await axios.get('/api/outfits', { timeout: 15000 })
      setOutfits(Array.isArray(response.data) ? response.data.slice(0, 3) : [])
    } catch (error) {
      console.error('Error fetching outfits:', error)
      setOutfits([])
    }
  }

  const handleGenerateOutfit = () => {
    navigate('/outfits')
  }

  const handleDeletePrenda = async (id) => {
    try {
      await axios.delete(`/api/prendas/${id}`)
      fetchPrendas()
    } catch (error) {
      console.error('Error deleting garment:', error)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--content-bg)' }}>
      <main className="dashboard-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[60vh]">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Your wardrobe and saved outfits</p>
        </div>

        {/* Recent Garments */}
        <section className="mb-20">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-600">
                <FaTshirt className="text-slate-200" />
              </div>
              Recent Garments
            </h2>
            <button
              type="button"
              onClick={() => navigate('/prendas')}
              className="text-slate-400 hover:text-slate-100 font-medium flex items-center gap-2 transition-colors"
            >
              View all
              <FaArrowRight className="text-sm" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
            </div>
          ) : prendas.length === 0 ? (
            <div className="dashboard-card text-center py-20 px-6 rounded-2xl border border-slate-600 shadow-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-600 flex items-center justify-center">
                <FaTshirt className="text-4xl text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">No garments yet</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Upload your first garment so the AI can classify it and you can start getting outfit recommendations.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
              >
                <FaUpload />
                Upload first garment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prendas.map((prenda) => (
                <PrendaCard
                  key={prenda._id}
                  prenda={prenda}
                  onDelete={handleDeletePrenda}
                />
              ))}
            </div>
          )}
        </section>

        {/* Saved Outfits - always show section */}
        <section className="mb-20">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-600">
                <FaMagic className="text-slate-200" />
              </div>
              Saved Outfits
            </h2>
            <button
              type="button"
              onClick={() => navigate('/outfits')}
              className="text-slate-400 hover:text-slate-100 font-medium flex items-center gap-2 transition-colors"
            >
              View all
              <FaArrowRight className="text-sm" />
            </button>
          </div>

          {outfits.length === 0 ? (
            <div className="dashboard-card text-center py-20 px-6 rounded-2xl border border-slate-600 shadow-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-600 flex items-center justify-center">
                <FaMagic className="text-4xl text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">No saved outfits</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Save outfits you like from the Recommendations tab. They will appear here.
              </p>
              <button
                type="button"
                onClick={handleGenerateOutfit}
                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
              >
                <FaMagic />
                Generate outfits
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {outfits.map((outfit) => (
                <OutfitCard key={outfit._id} outfit={outfit} />
              ))}
            </div>
          )}
        </section>

        {/* Mirror */}
        <section className="mb-20">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-600">
                <ScanLine className="text-slate-200 w-5 h-5" />
              </div>
              Mirror
            </h2>
            <button
              type="button"
              onClick={() => navigate('/mirror')}
              className="text-slate-400 hover:text-slate-100 font-medium flex items-center gap-2 transition-colors"
            >
              Open Mirror
              <FaArrowRight className="text-sm" />
            </button>
          </div>
          <div className="dashboard-card rounded-2xl border border-slate-600 p-6 lg:p-8">
            <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-2xl">
              Use your camera to get AI outfit feedback. The Mirror analyzes what you&apos;re wearing, considers weather and occasion, and suggests improvements or new items to add to your wardrobe.
            </p>
            <button
              type="button"
              onClick={() => navigate('/mirror')}
              className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              Launch Mirror
            </button>
          </div>
        </section>

        <footer className="app-footer">
          <p className="text-slate-500 text-sm">Fashion AI</p>
        </footer>
      </main>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchPrendas()
            setShowUploadModal(false)
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
