import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUpload } from 'react-icons/fa'
import axios from 'axios'
import PrendaCard from '../components/PrendaCard'
import EditOcasionModal from '../components/EditOcasionModal'
import { WardrobeSubNav } from '../components/WardrobeSubNav'

const UploadModal = lazy(() => import('../components/UploadModal'))

const Wardrobe = () => {
  const navigate = useNavigate()
  const [prendas, setPrendas] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    fetchPrendas()
  }, [])

  const fetchPrendas = async () => {
    setFetchError(null)
    setLoading(true)
    try {
      const healthRes = await axios.get('/api/health', { timeout: 4000 }).catch(() => null)
      if (!healthRes || !healthRes.data) {
        setPrendas([])
        setFetchError('The backend is not responding (port 4000). Run ./stop-all.sh and then ./start-all.sh from the project root. If it keeps failing, check logs/backend.log.')
        setLoading(false)
        return
      }
      const response = await axios.get('/api/prendas', { timeout: 15000 })
      setPrendas(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching garments:', error)
      setPrendas([])
      setFetchError(
        error.code === 'ECONNABORTED'
          ? 'Timeout. Backend or MongoDB is slow. Make sure the backend is running (./start-all.sh) and that MongoDB Atlas is accessible. Check logs/backend.log.'
          : 'Could not load garments. Make sure the backend is running and backend/.env has the correct MONGODB_URI.'
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredPrendas = useMemo(() => {
    if (selectedFilter === 'all') return prendas
    return prendas.filter(p => p.tipo === selectedFilter)
  }, [prendas, selectedFilter])

  const handleDelete = useCallback(async (id) => {
    try {
      await axios.delete(`/api/prendas/${id}`)
      fetchPrendas()
    } catch (error) {
      console.error('Error deleting garment:', error)
      alert('Error deleting the garment')
    }
  }, [])

  const handleEdit = useCallback((prenda) => {
    setSelectedPrenda(prenda)
    setShowEditModal(true)
  }, [])

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'superior', label: 'Top' },
    { value: 'inferior', label: 'Bottom' },
    { value: 'zapatos', label: 'Shoes' },
    { value: 'abrigo', label: 'Coat' },
    { value: 'vestido', label: 'Dress' },
  ]

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">

        {/* ── PAGE HEADER ── */}
        <div className="pb-6 mb-10 border-b border-[#0D0D0D]">
          <p className="sw-label text-[#FF3B00] mb-2">— WARDROBE</p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <h1 className="sw-display" style={{ fontSize: 'clamp(2.3rem, 6vw, 4.4rem)' }}>
              MY WARDROBE
            </h1>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="sw-btn sw-btn-primary sw-btn-lg w-full sm:w-auto justify-center"
            >
              <FaUpload />
              UPLOAD
            </button>
          </div>
          <p className="sw-label text-[#888] mt-3">
            {filteredPrendas.length} PIECES ·{' '}
            <Link to="/wardrobe/outfits" className="text-[#0D0D0D] underline underline-offset-2 hover:text-[#FF3B00]">
              Saved outfits
            </Link>
          </p>
        </div>

        <WardrobeSubNav />

        {/* ── FILTERS ── */}
        <div className="chip-row scrollbar-touch mt-0 mb-8 -mx-1 px-1">
          {FILTERS.map((f) => {
            const active = selectedFilter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setSelectedFilter(f.value)}
                className={`sw-chip ${active ? 'active' : ''}`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* ── GARMENTS ── */}
        <section className="mb-14">
          <h2 className="sw-heading text-[#0D0D0D] mb-6" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
            Garments
          </h2>
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 rounded-full border-2 border-[#D0CEC8] border-t-[#0D0D0D] animate-spin" />
              </div>
            ) : fetchError ? (
              <div className="sw-card text-center py-12 px-6 rounded-2xl border border-[#FF3B00]">
                <p className="text-[#FF3B00] mb-2 text-sm">{fetchError}</p>
                <button
                  type="button"
                  onClick={fetchPrendas}
                  className="sw-btn sw-btn-primary sw-btn-sm mt-4"
                >
                  Retry
                </button>
              </div>
            ) : filteredPrendas.length === 0 ? (
              <div className="sw-card text-center py-16 px-6 rounded-2xl border border-dashed border-[#D0CEC8]">
                <p className="sw-heading text-[#D0CEC8]" style={{ fontSize: '3rem' }}>EMPTY</p>
                <p className="sw-label text-[#888] mt-3">
                  {selectedFilter === 'all'
                    ? 'NO GARMENTS YET'
                    : `NO ${(FILTERS.find((f) => f.value === selectedFilter)?.label ?? selectedFilter).toUpperCase()} GARMENTS FOUND`}
                </p>
                <button
                  className="sw-btn sw-btn-ghost sw-btn-sm mt-6"
                  onClick={() => setSelectedFilter('all')}
                  type="button"
                >
                  CLEAR FILTER
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredPrendas.map((prenda) => (
                  <PrendaCard
                    key={prenda._id}
                    prenda={prenda}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onNavigateToDetail={(p) => navigate(`/wardrobe/prenda/${p._id}`)}
                  />
                ))}
              </div>
            )}
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

      {showEditModal && selectedPrenda && (
        <EditOcasionModal
          prenda={selectedPrenda}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPrenda(null)
          }}
          onSuccess={() => {
            fetchPrendas()
            setShowEditModal(false)
            setSelectedPrenda(null)
          }}
        />
      )}
      </div>
    </div>
  )
}

export default Wardrobe
