import { FaTrash } from 'react-icons/fa'
import axios from 'axios'

const OutfitCard = ({ outfit, onDelete }) => {
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

  const ItemBlock = ({ item, label }) => {
    if (!item?.imagen_url) return null
    return (
      <div className="group flex flex-col items-center">
        <div className="relative w-full aspect-square max-w-[120px] mx-auto rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 group-hover:border-slate-300 group-hover:shadow-md transition-all duration-300">
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
        <p className="text-xs font-semibold text-slate-700 mt-2 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-500 capitalize">{item.clase_nombre || '—'}</p>
        {item.color && item.color !== 'desconocido' && (
          <p className="text-xs text-slate-400 capitalize">{item.color}</p>
        )}
      </div>
    )
  }

  const showHeader = onDelete || explicaciones.length > 0

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-500">
      {showHeader && (
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {explicaciones.slice(0, 4).map((text, i) => (
              <span
                key={i}
                className="inline-block px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full border border-slate-200"
              >
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
      )}

      <div className="p-6">
        <div className={`grid gap-4 ${pieces.length <= 3 ? 'grid-cols-3' : pieces.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {pieces.map(({ item, label }) => (
            <ItemBlock key={label} item={item} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default OutfitCard
