import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import axios from 'axios'
import OutfitCard from '../components/OutfitCard'

const OutfitDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [outfit, setOutfit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOutfit = useCallback(async () => {
    if (!id) return
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/outfits/${id}`, { timeout: 15000 })
      setOutfit(data)
    } catch (err) {
      console.error(err)
      setOutfit(null)
      setError(err.response?.status === 404 ? 'Outfit not found.' : 'Could not load this outfit.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOutfit()
  }, [fetchOutfit])

  if (loading) {
    return (
      <div className="min-h-dvh sw-light flex items-center justify-center" style={{ background: 'var(--sw-white)' }}>
        <div className="inline-block w-12 h-12 rounded-full border-2 border-[#D0CEC8] border-t-[#0D0D0D] animate-spin" />
      </div>
    )
  }

  if (error || !outfit) {
    return (
      <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link to="/wardrobe/outfits" className="sw-btn sw-btn-ghost sw-btn-sm inline-flex items-center gap-2 mb-6">
            <FaArrowLeft /> Back to saved outfits
          </Link>
          <div className="sw-card rounded-2xl border border-[#D0CEC8] p-8 text-center">
            <p className="text-[#FF3B00]">{error || 'Not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link to="/wardrobe/outfits" className="sw-btn sw-btn-ghost sw-btn-sm inline-flex items-center gap-2 w-fit">
            <FaArrowLeft /> Saved outfits
          </Link>
          <Link to="/generate" className="sw-btn sw-btn-outline sw-btn-sm w-full sm:w-auto justify-center">
            Generate →
          </Link>
        </div>
        <p className="sw-label text-[#FF3B00] mb-2">— OUTFIT</p>
        <OutfitCard
          outfit={outfit}
          onDelete={() => navigate('/wardrobe/outfits')}
          showPuntuacion
          showPorQueCombina
        />
      </div>
    </div>
  )
}

export default OutfitDetail
