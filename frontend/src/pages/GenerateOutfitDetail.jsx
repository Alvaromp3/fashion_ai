import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaSave, FaShareAlt } from 'react-icons/fa'
import html2canvas from 'html2canvas'
import axios from 'axios'
import OutfitCard from '../components/OutfitCard'
import { buildSaveOutfitPayload, getComboKey } from '../utils/outfitHelpers'

const GenerateOutfitDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const outfit = location.state?.outfit

  const [shareFeedback, setShareFeedback] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleShare = async (elementFromClick) => {
    const el = elementFromClick ?? null
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
        backgroundColor: '#fafaf9',
        logging: false,
        allowTaint: true,
        imageTimeout: 0
      })
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setShareLoading(false)
            setShareFeedback('error')
            setTimeout(() => setShareFeedback(null), 3000)
            return
          }
          const fileName = 'outfit-fashion-ai.jpg'
          const file = new File([blob], fileName, { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)

          const tryShare = () => {
            if (
              typeof navigator !== 'undefined' &&
              navigator.share &&
              navigator.canShare &&
              navigator.canShare({ files: [file] })
            ) {
              return navigator
                .share({ files: [file], title: 'Outfit Fashion AI', text: 'Recommended outfit' })
                .then(() => true)
                .catch(() => false)
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
            setShareFeedback('ok')
            setShareLoading(false)
            setTimeout(() => setShareFeedback(null), 3000)
          })
        },
        'image/jpeg',
        0.9
      )
    } catch (err) {
      console.error('Error generating share image:', err)
      setShareLoading(false)
      setShareFeedback('error')
      setTimeout(() => setShareFeedback(null), 3000)
    }
  }

  const handleSaveOutfit = async () => {
    if (!outfit) return
    const body = buildSaveOutfitPayload(outfit)
    if (!body) {
      window.alert('This outfit is missing garments and cannot be saved.')
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post('/api/outfits/save', body)
      try {
        const raw = sessionStorage.getItem('fashion-ai-generate-recs')
        const list = raw ? JSON.parse(raw) : []
        const ck = getComboKey(outfit)
        const next = ck ? list.filter((o) => getComboKey(o) !== ck) : list
        sessionStorage.setItem('fashion-ai-generate-recs', JSON.stringify(next))
      } catch (e) {
        /* ignore */
      }
      navigate(`/wardrobe/outfit/${data._id}`, { replace: true })
    } catch (err) {
      console.error('Error saving outfit:', err)
      alert('Error saving the outfit')
    } finally {
      setSaving(false)
    }
  }

  if (!outfit) {
    return <Navigate to="/generate" replace />
  }

  return (
    <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link to="/generate" className="sw-btn sw-btn-ghost sw-btn-sm inline-flex items-center gap-2 w-fit">
            <FaArrowLeft /> Generate
          </Link>
          <Link to="/wardrobe/outfits" className="sw-btn sw-btn-outline sw-btn-sm w-full sm:w-auto justify-center">
            Saved outfits
          </Link>
        </div>
        <p className="sw-label text-[#FF3B00] mb-2">— SUGGESTION</p>
        <div data-outfit-card className="sw-card rounded-2xl border border-[#D0CEC8] overflow-hidden shadow-sm">
          <OutfitCard
            outfit={outfit}
            showPuntuacion
            showPorQueCombina
          />
          <div className="p-5 border-t border-[#D0CEC8] bg-white flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveOutfit}
              disabled={saving}
              className="flex-1 min-w-[120px] sw-btn sw-btn-primary sw-btn-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <FaSave className="shrink-0" />
              {saving ? 'Saving…' : 'Save outfit'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                const card = e.currentTarget.closest('[data-outfit-card]')
                handleShare(card)
              }}
              disabled={shareLoading}
              className="sw-btn sw-btn-outline sw-btn-sm flex items-center gap-2 disabled:opacity-70"
            >
              <FaShareAlt />
              {shareFeedback === 'ok' ? 'Downloaded!' : shareLoading ? 'Generating…' : 'Share image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GenerateOutfitDetail
