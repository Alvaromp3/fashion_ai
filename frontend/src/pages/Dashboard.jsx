import { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMagic, FaTshirt, FaArrowRight, FaUpload } from 'react-icons/fa'
import { ScanLine } from 'lucide-react'
import axios from 'axios'
import PrendaCard from '../components/PrendaCard'
import OutfitCard from '../components/OutfitCard'

const UploadModal = lazy(() => import('../components/UploadModal'))

const Dashboard = () => {
  const [prendas, setPrendas] = useState([])
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const navigate = useNavigate()

  // Visual-only stats (no afecta la lógica / BD)
  const STATS = [
    { label: 'GARMENTS', val: '24' },
    { label: 'OUTFITS', val: '08' },
    { label: 'VIT SCANS', val: '47' },
    { label: 'STYLE SCORE', val: '9.2' }
  ]

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
    <div className="min-h-screen" style={{ background: 'var(--sw-white)' }}>

      {/* ── HERO ── */}
      <section className="border-b border-[#0D0D0D] relative overflow-hidden">
        <div className="absolute inset-0">
          {/* Visual-only: usamos una imagen remota para no romper si /hero-fashion.png no existe */}
          <img
            src="https://images.unsplash.com/photo-1520975958225-9a2b1c1b7b9b?w=1600&q=80"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 sw-stripe" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 pt-16 pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
            <div>
              <p className="sw-label text-[#FF3B00] mb-4">— AI WARDROBE INTELLIGENCE</p>
              <h1 className="sw-display text-[#0D0D0D]" style={{ fontSize: 'clamp(3.5rem, 9vw, 7rem)' }}>
                YOUR<br />
                STYLE.<br />
                AI<span className="text-[#FF3B00]">FIED.</span>
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="sw-btn sw-btn-primary sw-btn-lg"
                  onClick={() => setShowUploadModal(true)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Garment
                </button>
                <button
                  type="button"
                  className="sw-btn sw-btn-outline sw-btn-lg"
                  onClick={handleGenerateOutfit}
                >
                  Generate Outfits →
                </button>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="sw-label text-[#888] mb-2">ViT CLASSIFICATION</p>
              <p className="sw-heading text-[#0D0D0D]" style={{ fontSize: '1.1rem' }}>
                &quot;VISION TRANSFORMER
                <br />
                POWERED FASHION&quot;
              </p>
              <div className="mt-4 flex justify-end gap-4">
                {STATS.map((s) => (
                  <div key={s.label} className="text-right">
                    <p className="sw-display text-[#0D0D0D]" style={{ fontSize: '2rem' }}>{s.val}</p>
                    <p className="sw-label text-[#888]" style={{ fontSize: '0.55rem' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="marquee-bar">
        <div className="sw-marquee-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <>
              <span className="sw-label text-white px-6" style={{ fontSize: '0.7rem' }}>CLASSIFY WITH VIT</span>
              <span className="text-[#FF3B00] px-2">✦</span>
              <span className="sw-label text-white px-6" style={{ fontSize: '0.7rem' }}>GENERATE OUTFITS</span>
              <span className="text-[#FF3B00] px-2">✦</span>
              <span className="sw-label text-white px-6" style={{ fontSize: '0.7rem' }}>MIRROR AI STYLE</span>
              <span className="text-[#FF3B00] px-2">✦</span>
              <span className="sw-label text-white px-6" style={{ fontSize: '0.7rem' }}>FASHION INTELLIGENCE</span>
              <span className="text-[#FF3B00] px-2">✦</span>
            </>
          ))}
        </div>
      </div>

      {/* ── STATS mobile ── */}
      <div className="md:hidden grid grid-cols-4 border-b border-[#0D0D0D]">
        {STATS.map((s, i) => (
          <div key={s.label} className={`p-4 text-center ${i < 3 ? 'border-r border-[#D0CEC8]' : ''}`}>
            <p className="sw-display text-[#0D0D0D]" style={{ fontSize: '1.6rem' }}>{s.val}</p>
            <p className="sw-label text-[#888]" style={{ fontSize: '0.5rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── RECENT GARMENTS ── */}
      <section className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between mb-8 border-b border-[#0D0D0D] pb-4">
          <div>
            <p className="sw-label text-[#FF3B00] mb-1">— YOUR WARDROBE</p>
            <h2 className="sw-heading" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>RECENT GARMENTS</h2>
          </div>
          <button type="button" onClick={() => navigate('/prendas')} className="sw-btn sw-btn-outline sw-btn-sm">
            VIEW ALL →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-[#D0CEC8] border-t-[#0D0D0D] animate-spin" />
          </div>
        ) : prendas.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#D0CEC8]">
            <p className="sw-heading text-[#D0CEC8]" style={{ fontSize: '3rem' }}>EMPTY</p>
            <p className="sw-label text-[#888] mt-3">NO GARMENTS FOUND</p>
            <button className="sw-btn sw-btn-ghost sw-btn-sm mt-6" type="button" onClick={() => setShowUploadModal(true)}>
              UPLOAD FIRST →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {prendas.map((prenda, i) => (
              <div key={prenda._id} className="anim-up" style={{ animationDelay: `${i * 60}ms` }}>
                <PrendaCard prenda={prenda} onDelete={handleDeletePrenda} />
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="sw-divider max-w-7xl mx-auto" />

      {/* ── SAVED OUTFITS ── */}
      <section className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between mb-8 border-b border-[#0D0D0D] pb-4">
          <div>
            <p className="sw-label text-[#FF3B00] mb-1">— YOUR LOOKS</p>
            <h2 className="sw-heading" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>SAVED OUTFITS</h2>
          </div>
          <button type="button" onClick={() => navigate('/outfits')} className="sw-btn sw-btn-outline sw-btn-sm">
            VIEW ALL →
          </button>
        </div>

        {outfits.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#D0CEC8]">
            <p className="sw-heading text-[#D0CEC8]" style={{ fontSize: '3rem' }}>EMPTY</p>
            <p className="sw-label text-[#888] mt-3">NO SAVED OUTFITS</p>
            <button className="sw-btn sw-btn-primary sw-btn-sm mt-6" type="button" onClick={handleGenerateOutfit}>
              GENERATE OUTFITS →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outfits.map((outfit, i) => (
              <div key={outfit._id} className="anim-up" style={{ animationDelay: `${i * 80}ms` }}>
                <OutfitCard outfit={outfit} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CTA BAND ── */}
      <section className="border-t border-[#0D0D0D] bg-[#0D0D0D] py-16">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="sw-label text-[#FF3B00] mb-2">— STYLE MIRROR</p>
            <h2 className="sw-heading text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
              TRY YOUR
              <br />
              OUTFIT LIVE
            </h2>
          </div>
          <button type="button" className="sw-btn sw-btn-accent sw-btn-lg" onClick={() => navigate('/mirror')}>
            Open Mirror →
          </button>
        </div>
      </section>

      {showUploadModal && (
        <Suspense fallback={null}>
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              fetchPrendas()
              setShowUploadModal(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

export default Dashboard
