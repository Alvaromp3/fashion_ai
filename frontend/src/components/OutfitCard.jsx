import { useState } from 'react'
import { FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import axios from 'axios'
import PrendaModal from './PrendaModal'

const OutfitCard = ({ outfit, onDelete, onPrendaClick, showPuntuacion = true, showPorQueCombina = true }) => {
  const [porQueOpen, setPorQueOpen] = useState(false)
  const getImageUrl = (url) => {
    if (!url) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="12"%3ENo img%3C/text%3E%3C/svg%3E'
    }
    if (url.startsWith('http')) return url
    if (url.startsWith('/uploads/')) return url
    if (!url.startsWith('/')) return `/${url}`
    return url
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this outfit?')) {
      try {
        await axios.delete(`/api/outfits/${outfit._id}`)
        if (onDelete) onDelete()
      } catch (error) {
        console.error('Error deleting outfit:', error)
        alert('Error deleting the outfit')
      }
    }
  }

  const superior = outfit.superior_id || outfit.superior
  const superiorSecundario = outfit.superior_secundario_id || outfit.superiorSecundario
  const inferior = outfit.inferior_id || outfit.inferior
  const zapatos = outfit.zapatos_id || outfit.zapatos
  const abrigo = outfit.abrigo_id || outfit.abrigo
  const explicaciones = outfit.explicaciones || []
  const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="12"%3ENo img%3C/text%3E%3C/svg%3E'

  const pieces = [
    superior && { item: superior, label: 'Top' },
    superiorSecundario && { item: superiorSecundario, label: 'Pullover' },
    inferior && { item: inferior, label: 'Bottom' },
    zapatos && { item: zapatos, label: 'Shoes' },
    abrigo && { item: abrigo, label: 'Coat' }
  ].filter(Boolean)

  const ItemBlock = ({ item, label, onClick }) => {
    if (!item?.imagen_url) return null
    const Wrapper = onClick ? 'button' : 'div'
    const accentByLabel = {
      Top: 'var(--sw-accent2)',
      Pullover: '#7C3AED',
      Bottom: '#00A550',
      Shoes: 'var(--sw-accent)',
      Coat: 'var(--sw-black)',
    }
    const accent = accentByLabel[label] || 'var(--sw-border)'
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`group flex flex-col rounded-xl border border-[#D0CEC8] bg-white p-3 transition-all duration-300 hover:shadow-md text-left ${onClick ? 'cursor-pointer' : ''}`}
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <div
          className="relative w-full aspect-square max-w-[100px] mx-auto rounded-lg overflow-hidden bg-white border transition-all"
          style={{ borderColor: accent }}
        >
          <img
            src={getImageUrl(item.imagen_url)}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = placeholderImg
            }}
          />
        </div>
        <p className="sw-label mt-2" style={{ fontSize: '0.6rem', color: accent }}>{label}</p>
        <p className="text-xs font-medium text-[#0D0D0D] truncate capitalize" title={item.clase_nombre}>{item.clase_nombre || '—'}</p>
        {item.color && item.color !== 'desconocido' && (
          <p className="text-xs text-[#888] capitalize">{item.color}</p>
        )}
      </Wrapper>
    )
  }

  const puntuacion = outfit.puntuacion != null ? Number(outfit.puntuacion) : null
  const ocasionChip = explicaciones.find(t => t.startsWith('Perfect for '))?.replace('Perfect for ', '').replace(' occasion', '') || null
  const estiloChips = explicaciones.filter(t => ['Minimalist and elegant style', 'Colorful and vibrant look', 'Elegant and sophisticated combination', 'Modern and current look'].includes(t)).map(t => {
    if (t.includes('Minimalist')) return 'Minimalist'
    if (t.includes('Colorful')) return 'Colorful'
    if (t.includes('Elegant')) return 'Elegant'
    if (t.includes('Modern')) return 'Modern'
    return t
  })
  const showHeader = onDelete || explicaciones.length > 0 || puntuacion != null || ocasionChip || estiloChips.length > 0
  const titleTag = explicaciones[0] && !explicaciones[0].startsWith('Perfect for ') ? explicaciones[0] : null
  const stylePhrases = ['Minimalist and elegant style', 'Colorful and vibrant look', 'Elegant and sophisticated combination', 'Modern and current look']
  const restTags = explicaciones.filter(t => t !== titleTag && !t.startsWith('Perfect for ') && !stylePhrases.includes(t)).slice(0, 3)

  return (
    <div className="sw-card rounded-2xl overflow-hidden border-[#D0CEC8]">
      {showHeader && (
        <div className="px-5 pt-4 pb-3 border-b border-[#D0CEC8] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {puntuacion != null && showPuntuacion && (
                <span className="sw-badge sw-badge-green">
                  Match {Math.round(puntuacion)}%
                </span>
              )}
              {ocasionChip && (
                <span className="sw-badge sw-badge-red">
                  {ocasionChip}
                </span>
              )}
              {estiloChips.map((s, i) => (
                <span key={i} className="sw-badge sw-badge-black">
                  {s}
                </span>
              ))}
              {titleTag && (
                <span className="sw-label" style={{ fontSize: '0.65rem' }}>{titleTag}</span>
              )}
              {restTags.map((text, i) => (
                <span key={i} className="sw-badge" style={{ background: 'transparent' }}>
                  {text}
                </span>
              ))}
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="sw-btn sw-btn-ghost sw-btn-sm"
                aria-label="Delete outfit"
                style={{ width: 44, height: 44, padding: 0, borderRadius: 12 }}
              >
                <FaTrash className="text-[#0D0D0D]" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className={`grid gap-3 ${pieces.length <= 3 ? 'grid-cols-3' : pieces.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {pieces.map(({ item, label }) => (
            <ItemBlock
              key={label}
              item={item}
              label={label}
              onClick={() => onPrendaClick?.(item, label)}
            />
          ))}
        </div>

        {showPorQueCombina && explicaciones.length > 0 && (
          <div className="mt-4 border-t border-[#D0CEC8] pt-3">
            <button
              type="button"
              onClick={() => setPorQueOpen(!porQueOpen)}
              className="flex items-center gap-2 text-sm font-medium text-[#0D0D0D] hover:text-[#FF3B00] w-full transition-colors"
            >
              {porQueOpen ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
              See why it matches
            </button>
            {porQueOpen && (
              <ul className="mt-2 space-y-1 text-xs text-[#0D0D0D] pl-5 list-disc">
                {explicaciones.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OutfitCard
