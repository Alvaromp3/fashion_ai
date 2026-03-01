import { Link } from 'react-router-dom'

const PrendaModal = ({ prenda, label, onClose }) => {
  if (!prenda) return null

  const getImageUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/uploads/')) return url
    if (!url.startsWith('/')) return `/${url}`
    return url
  }

  const imagenUrl = getImageUrl(prenda.imagen_url)
  const nombre = prenda.clase_nombre || 'Prenda'
  const color = prenda.color && prenda.color !== 'desconocido' ? prenda.color : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-slate-100">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={nombre}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Sin imagen</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
          {label && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-slate-800 text-xs font-semibold uppercase tracking-wide shadow">
              {label}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-slate-900 capitalize">{nombre}</h3>
          {color && <p className="text-slate-600 mt-1 capitalize">Color: {color}</p>}
          <p className="text-slate-500 text-sm mt-1">Categoría: {label || '—'}</p>
          <Link
            to="/prendas"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            onClick={onClose}
          >
            Ver en Mis Prendas →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PrendaModal
