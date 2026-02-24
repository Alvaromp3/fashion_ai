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

  const categoryStyles = {
    Top: 'border-l-sky-500 bg-sky-500/5',
    Pullover: 'border-l-violet-500 bg-violet-500/5',
    Bottom: 'border-l-emerald-500 bg-emerald-500/5',
    Shoes: 'border-l-amber-500 bg-amber-500/5',
    Coat: 'border-l-slate-500 bg-slate-500/5'
  }

  const pieces = [
    superior && { item: superior, label: 'Top' },
    superiorSecundario && { item: superiorSecundario, label: 'Pullover' },
    inferior && { item: inferior, label: 'Bottom' },
    zapatos && { item: zapatos, label: 'Shoes' },
    abrigo && { item: abrigo, label: 'Coat' }
  ].filter(Boolean)

  const ItemBlock = ({ item, label, onClick }) => {
    if (!item?.imagen_url) return null
    const style = categoryStyles[label] || 'border-l-slate-400 bg-slate-500/5'
    const Wrapper = onClick ? 'button' : 'div'
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`group flex flex-col rounded-xl border-l-4 ${style} p-3 transition-all duration-300 hover:shadow-md text-left ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="relative w-full aspect-square max-w-[100px] mx-auto rounded-lg overflow-hidden ring-1 ring-slate-200/80 bg-slate-50 group-hover:ring-slate-300 transition-all">
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
        <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-medium text-slate-700 truncate capitalize" title={item.clase_nombre}>{item.clase_nombre || '—'}</p>
        {item.color && item.color !== 'desconocido' && (
          <p className="text-xs text-slate-500 capitalize">{item.color}</p>
        )}
      </Wrapper>
    )
  }

  const puntuacion = outfit.puntuacion != null ? Number(outfit.puntuacion) : null
  const ocasionChip = explicaciones.find(t => t.startsWith('Perfect for '))?.replace('Perfect for ', '').replace(' occasion', '') || null
  const estiloChips = explicaciones.filter(t => ['Minimalist and elegant style', 'Colorful and vibrant look', 'Elegant and sophisticated combination', 'Modern and current look'].includes(t)).map(t => {
    if (t.includes('Minimalist')) return 'Minimalista'
    if (t.includes('Colorful')) return 'Colorido'
    if (t.includes('Elegant')) return 'Elegante'
    if (t.includes('Modern')) return 'Moderno'
    return t
  })
  const showHeader = onDelete || explicaciones.length > 0 || puntuacion != null || ocasionChip || estiloChips.length > 0
  const titleTag = explicaciones[0] && !explicaciones[0].startsWith('Perfect for ') ? explicaciones[0] : null
  const stylePhrases = ['Minimalist and elegant style', 'Colorful and vibrant look', 'Elegant and sophisticated combination', 'Modern and current look']
  const restTags = explicaciones.filter(t => t !== titleTag && !t.startsWith('Perfect for ') && !stylePhrases.includes(t)).slice(0, 3)

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300">
      {showHeader && (
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {puntuacion != null && showPuntuacion && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  Match {Math.round(puntuacion)}%
                </span>
              )}
              {ocasionChip && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-medium capitalize border border-sky-200">
                  {ocasionChip}
                </span>
              )}
              {estiloChips.map((s, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-medium border border-violet-200">
                  {s}
                </span>
              ))}
              {titleTag && (
                <span className="text-sm font-semibold text-slate-800">{titleTag}</span>
              )}
              {restTags.map((text, i) => (
                <span key={i} className="inline-block px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full border border-slate-200/80">
                  {text}
                </span>
              ))}
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Delete outfit"
              >
                <FaTrash className="text-sm" />
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
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setPorQueOpen(!porQueOpen)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 w-full"
            >
              {porQueOpen ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
              Ver por qué combina
            </button>
            {porQueOpen && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600 pl-5 list-disc">
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
