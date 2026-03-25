import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaTrash } from 'react-icons/fa'
import axios from 'axios'
import EditOcasionModal from '../components/EditOcasionModal'

const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/uploads/')) return url
  if (!url.startsWith('/')) return `/${url}`
  return url
}

const PrendaDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prenda, setPrenda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchPrenda = useCallback(async () => {
    if (!id) return
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/prendas/${id}`, { timeout: 15000 })
      setPrenda(data)
    } catch (err) {
      console.error(err)
      setPrenda(null)
      setError(err.response?.status === 404 ? 'Garment not found.' : 'Could not load this garment.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPrenda()
  }, [fetchPrenda])

  const handleDelete = async () => {
    if (!prenda?._id) return
    if (!window.confirm('Delete this garment?')) return
    try {
      await axios.delete(`/api/prendas/${prenda._id}`)
      navigate('/wardrobe')
    } catch (e) {
      console.error(e)
      alert('Could not delete the garment')
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh sw-light flex items-center justify-center" style={{ background: 'var(--sw-white)' }}>
        <div className="inline-block w-12 h-12 rounded-full border-2 border-[#D0CEC8] border-t-[#0D0D0D] animate-spin" />
      </div>
    )
  }

  if (error || !prenda) {
    return (
      <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link to="/wardrobe" className="sw-btn sw-btn-ghost sw-btn-sm inline-flex items-center gap-2 mb-6">
            <FaArrowLeft /> Back to wardrobe
          </Link>
          <div className="sw-card rounded-2xl border border-[#D0CEC8] p-8 text-center">
            <p className="text-[#FF3B00]">{error || 'Not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const imagenUrl = getImageUrl(prenda.imagen_url)
  const ocasion = Array.isArray(prenda.ocasion) ? prenda.ocasion.join(', ') : prenda.ocasion || '—'

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">
        <Link to="/wardrobe" className="sw-btn sw-btn-ghost sw-btn-sm inline-flex items-center gap-2 mb-6">
          <FaArrowLeft /> Wardrobe
        </Link>

        <div className="sw-card rounded-2xl border border-[#D0CEC8] overflow-hidden">
          <div className="relative aspect-[4/5] sm:aspect-[3/4] max-h-[70vh] bg-[#f5f5f5]">
            <img src={imagenUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="p-6 border-t border-[#D0CEC8] space-y-3">
            <p className="sw-label text-[#FF3B00]">— GARMENT</p>
            <h1 className="sw-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
              {prenda.clase_nombre && prenda.clase_nombre !== 'desconocido' ? prenda.clase_nombre : prenda.tipo}
            </h1>
            <dl className="grid gap-2 text-sm text-[#0D0D0D]">
              <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/60 pb-2">
                <dt className="text-[#888]">Type</dt>
                <dd className="font-medium capitalize">{prenda.tipo || '—'}</dd>
              </div>
              {prenda.color && prenda.color !== 'desconocido' && (
                <div className="flex justify-between gap-4 border-b border-[#D0CEC8]/60 pb-2">
                  <dt className="text-[#888]">Color</dt>
                  <dd className="font-medium capitalize">{prenda.color}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pb-2">
                <dt className="text-[#888]">Occasion</dt>
                <dd className="font-medium capitalize">{ocasion}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="sw-btn sw-btn-primary sw-btn-sm" onClick={() => setShowEditModal(true)}>
                Edit occasion
              </button>
              <button type="button" className="sw-btn sw-btn-accent sw-btn-sm inline-flex items-center gap-2" onClick={handleDelete}>
                <FaTrash className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditOcasionModal
          prenda={prenda}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchPrenda()
          }}
        />
      )}
    </div>
  )
}

export default PrendaDetail
