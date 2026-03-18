import { useMemo } from 'react'
import { FaTrash } from 'react-icons/fa'

const PrendaCard = ({ prenda, onDelete, onEdit }) => {
  const getImageUrl = () => {
    if (prenda.imagen_url.startsWith('http')) {
      return prenda.imagen_url
    }
    if (prenda.imagen_url.startsWith('/uploads')) {
      return prenda.imagen_url
    }
    return prenda.imagen_url.startsWith('/') ? prenda.imagen_url : `/${prenda.imagen_url}`
  }

  const catText = useMemo(() => {
    const raw = (prenda?.tipo ?? '').toString().toLowerCase()
    const map = {
      superior: 'TOP',
      inferior: 'BOTTOM',
      zapatos: 'SHOES',
      abrigo: 'COAT',
      vestido: 'DRESS',
      bolso: 'BAG',
      joyería: 'JEWELRY',
      joyeria: 'JEWELRY',
      sombrero: 'HAT',
      'cinturón': 'BELT',
      cinturon: 'BELT',
      gafas: 'GLASSES',
    }
    return map[raw] || raw.toUpperCase() || 'UNKNOWN'
  }, [prenda?.tipo])

  const occText = useMemo(() => {
    const o = prenda?.ocasion
    const map = {
      casual: 'CASUAL',
      formal: 'FORMAL',
      deportivo: 'SPORTY',
      fiesta: 'PARTY',
      trabajo: 'WORK',
    }
    if (Array.isArray(o)) {
      const raw = o?.[0] ? String(o[0]).toString().toLowerCase() : ''
      return raw ? (map[raw] || raw.toUpperCase()) : '—'
    }
    if (o) {
      const raw = String(o).toLowerCase()
      return raw ? (map[raw] || raw.toUpperCase()) : '—'
    }
    return '—'
  }, [prenda?.ocasion])

  return (
    <div
      className="sw-card group cursor-pointer overflow-hidden"
      onClick={() => onEdit && onEdit(prenda)}
      title="Click to edit the occasion"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/5' }}>
        <img
          src={getImageUrl()}
          alt={prenda.tipo}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="256"%3E%3Crect width="400" height="256" fill="%23f5f5f5"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23a3a3a3"%3ENo image%3C/text%3E%3C/svg%3E'
          }}
        />

        {/* Category tag */}
        <div className="absolute top-0 left-0 px-2.5 py-1 bg-white text-[#0D0D0D] border border-[#D0CEC8]">
          <span className="sw-label" style={{ fontSize: '0.55rem' }}>
            {catText}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#0D0D0D]/80 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit && onEdit(prenda)
            }}
            className="sw-btn sw-btn-sm"
            style={{
              padding: '9px 16px',
              background: 'transparent',
              color: 'white',
              border: '1.5px solid white'
            }}
          >
            EDIT OCCASION
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete && onDelete(prenda._id)
            }}
            className="sw-btn sw-btn-sm sw-btn-accent"
          >
            <FaTrash className="w-3.5 h-3.5" />
            DELETE
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-[#D0CEC8]">
        <p className="sw-label text-[#0D0D0D]" style={{ fontSize: '0.65rem' }}>
          {prenda.clase_nombre && prenda.clase_nombre !== 'desconocido'
            ? prenda.clase_nombre
            : catText}
        </p>
        <p className="sw-label text-[#888] mt-0.5" style={{ fontSize: '0.55rem' }}>
          {occText}
        </p>
      </div>
    </div>
  )
}

export default PrendaCard
