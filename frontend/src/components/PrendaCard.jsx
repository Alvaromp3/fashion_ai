import { FaTrash, FaTag, FaCalendar, FaEdit } from 'react-icons/fa'

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

  const getTipoColor = (tipo) => {
    const colors = {
      superior: 'bg-gray-900 text-white',
      inferior: 'bg-gray-800 text-white',
      zapatos: 'bg-gray-700 text-white',
      abrigo: 'bg-gray-800 text-white',
      vestido: 'bg-gray-700 text-white'
    }
    return colors[tipo] || 'bg-gray-600 text-white'
  }

  return (
    <div 
      className="card-3d bg-white rounded-2xl shadow-soft overflow-hidden hover:shadow-large border border-gray-100 cursor-pointer group" 
      onClick={() => onEdit && onEdit(prenda)}
      title="Click to edit the occasion"
    >
      <div className="relative card-3d-inner">
        <img
          src={getImageUrl()}
          alt={prenda.tipo}
          className="w-full h-64 object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="256"%3E%3Crect width="400" height="256" fill="%23f5f5f5"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23a3a3a3"%3ENo image%3C/text%3E%3C/svg%3E'
          }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(prenda._id)
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-600 p-2 rounded-lg hover:bg-white hover:text-gray-900 transition-all shadow-soft"
        >
          <FaTrash className="text-sm" />
        </button>
      </div>
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getTipoColor(prenda.tipo)}`}>
            <FaTag className="inline mr-1.5" />
            {prenda.tipo}
          </span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
            {(prenda.confianza * 100).toFixed(0)}%
          </span>
        </div>
        {prenda.clase_nombre && prenda.clase_nombre !== 'desconocido' && (
          <p className="text-xs text-gray-500 mb-2 font-medium">{prenda.clase_nombre}</p>
        )}
        <p className="text-sm text-gray-600 mb-2">Color: <span className="font-medium text-gray-900">{prenda.color}</span></p>
        {prenda.ocasion && Array.isArray(prenda.ocasion) && prenda.ocasion.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-1">
              <FaCalendar className="text-gray-400" />
              <span>Occasions:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prenda.ocasion.map((oc, idx) => (
                <span 
                  key={idx}
                  className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-700 capitalize font-medium"
                >
                  {oc}
                </span>
              ))}
            </div>
          </div>
        ) : prenda.ocasion && !Array.isArray(prenda.ocasion) ? (
          <div className="flex items-center space-x-1.5 text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
            <FaCalendar className="text-gray-500" />
            <span className="capitalize font-medium">{prenda.ocasion}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-gray-400 italic">
            <FaCalendar className="text-gray-300" />
            <span>No occasion</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <FaEdit className="text-gray-400" />
            <span className="text-gray-500">Click to edit occasion</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrendaCard
