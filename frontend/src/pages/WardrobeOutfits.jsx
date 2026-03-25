import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import SavedOutfitGridCard from '../components/SavedOutfitGridCard'
import { WardrobeSubNav } from '../components/WardrobeSubNav'

const WardrobeOutfits = () => {
  const navigate = useNavigate()
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOutfits = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/outfits', { timeout: 15000 })
      setOutfits(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Error fetching outfits:', err)
      setOutfits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOutfits()
  }, [fetchOutfits])

  const handleDeleteOutfit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this outfit?')) return
    try {
      await axios.delete(`/api/outfits/${id}`)
      fetchOutfits()
    } catch (err) {
      console.error('Error deleting outfit:', err)
      alert('Error deleting the outfit')
    }
  }

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="sw-heading text-[#0D0D0D] m-0" style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.35rem)' }}>
            Saved outfits
          </h1>
          <Link
            to="/generate"
            className="sw-btn sw-btn-outline sw-btn-sm w-full sm:w-auto justify-center shrink-0"
          >
            Generate →
          </Link>
        </div>

        <WardrobeSubNav />

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-12 h-12 rounded-full border-2 border-[#D0CEC8] border-t-[#0D0D0D] animate-spin" />
          </div>
        ) : outfits.length === 0 ? (
          <div className="sw-card text-center py-14 px-6 rounded-2xl border border-dashed border-[#D0CEC8]">
            <p className="sw-label text-[#888]">NO SAVED OUTFITS YET</p>
            <p className="text-sm text-[#888] mt-2 max-w-md mx-auto">
              Generate combinations and save your favorites here.
            </p>
            <Link to="/generate" className="sw-btn sw-btn-primary sw-btn-sm mt-6 inline-flex">
              Go to Generate
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {outfits.map((outfit) => (
              <SavedOutfitGridCard
                key={outfit._id}
                outfit={outfit}
                onOpen={() => navigate(`/wardrobe/outfit/${outfit._id}`)}
                onDelete={() => handleDeleteOutfit(outfit._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WardrobeOutfits
