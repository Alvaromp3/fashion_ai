import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMagic, FaTshirt, FaArrowRight, FaBrain, FaImage, FaChartLine, FaStar, FaUpload } from 'react-icons/fa'
import axios from 'axios'
import PrendaCard from '../components/PrendaCard'
import OutfitCard from '../components/OutfitCard'
import UploadModal from '../components/UploadModal'
import { MusicReactiveHeroSection } from '../components/ui/music-reactive-hero-section'

const Dashboard = () => {
  const [prendas, setPrendas] = useState([])
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const mainContentRef = useRef(null)
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

  const handleScrollToContent = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      <MusicReactiveHeroSection
        tagline="Classify with AI"
        titleLine1="FASHION"
        titleLine2="AI"
        subtitle="Classify your garments with AI and get personalized outfit recommendations."
        onScrollClick={handleScrollToContent}
      />

      {/* Hero to content transition */}
      <div
        className="dashboard-hero-transition h-28 sm:h-36 w-full shrink-0"
        aria-hidden
      />

      <main ref={mainContentRef} className="dashboard-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-px min-h-[60vh]">
        {/* How does our AI work */}
        <section className="dashboard-card mb-20 rounded-2xl shadow-sm border border-slate-700 p-8 lg:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-slate-700">
              <FaBrain className="text-white text-xl" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-100">How does our AI work?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaImage className="text-slate-200 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-2">1. Automatic Classification</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Upload a photo of your garment and our AI analyzes it with CNN or Vision Transformer (ViT).
                  Identifies the type of garment (T-shirt, Pullover, Pants, Sneakers, etc.) with high accuracy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaStar className="text-slate-200 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-2">2. Color Detection</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Our algorithm detects the dominant color, ignoring the background.
                  Uses HSV analysis and clustering to identify the main color of the garment.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaChartLine className="text-slate-200 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-2">3. Smart Recommendations</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Based on your preferences (occasion, style, colors), we generate personalized
                  outfits that combine color harmony and context appropriateness.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-600 space-y-6">
            <div className="dashboard-card-elevated rounded-xl p-6 border border-slate-600">
              <h4 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <FaBrain className="text-slate-400" />
                CNN Model
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Traditional convolutional neural network trained on over 70,000 clothing images in 10 categories.
                Uses TensorFlow/Keras with data augmentation and early stopping for robust image classification.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg">TensorFlow</span>
                <span className="px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded-lg">Keras</span>
                <span className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg">CNN</span>
                <span className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg">~87% Accuracy</span>
              </div>
            </div>
            <div className="dashboard-card-elevated rounded-xl p-6 border border-slate-600">
              <h4 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <FaBrain className="text-slate-400" />
                Vision Transformer (ViT)
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Transformer-based architecture that splits the image into patches and applies self-attention,
                capturing global context. We applied a classification head and fine-tuning on the Fashion-MNIST–style
                dataset for better results, achieving higher accuracy than the CNN baseline.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded-lg">Transformer</span>
                <span className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg">Self-Attention</span>
                <span className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-lg">ViT</span>
                <span className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg">~94% Accuracy</span>
              </div>
            </div>
          </div>
        </section>

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

        <footer className="app-footer">
          <p>
            Development by <span className="app-footer-accent">Alvaro Martin-Pena</span>
          </p>
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
