import { useState, useEffect } from 'react'
import { FaFilter, FaUpload } from 'react-icons/fa'
import axios from 'axios'
import PrendaCard from '../components/PrendaCard'
import UploadModal from '../components/UploadModal'
import EditOcasionModal from '../components/EditOcasionModal'

const MisPrendas = () => {
  const [prendas, setPrendas] = useState([])
  const [filteredPrendas, setFilteredPrendas] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    fetchPrendas()
  }, [])

  useEffect(() => {
    filterPrendas()
  }, [prendas, selectedFilter])

  const fetchPrendas = async () => {
    setFetchError(null)
    setLoading(true)
    try {
      const healthRes = await axios.get('/api/health', { timeout: 4000 }).catch(() => null)
      if (!healthRes || !healthRes.data) {
        setPrendas([])
        setFetchError('El backend no responde (puerto 4000). Ejecuta ./stop-all.sh y luego ./start-all.sh desde la raíz del proyecto. Si sigue fallando, revisa logs/backend.log.')
        setLoading(false)
        return
      }
      const response = await axios.get('/api/prendas', { timeout: 15000 })
      setPrendas(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching garments:', error)
      setPrendas([])
      setFetchError(
        error.code === 'ECONNABORTED'
          ? 'Timeout. Backend o MongoDB lentos. Comprueba que el backend esté en marcha (./start-all.sh) y que MongoDB Atlas sea accesible. Revisa logs/backend.log.'
          : 'No se pudieron cargar las prendas. Comprueba que el backend esté corriendo y que backend/.env tenga MONGODB_URI correcto.'
      )
    } finally {
      setLoading(false)
    }
  }

  const filterPrendas = () => {
    if (selectedFilter === 'all') {
      setFilteredPrendas(prendas)
    } else {
      setFilteredPrendas(prendas.filter(p => p.tipo === selectedFilter))
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/prendas/${id}`)
      fetchPrendas()
    } catch (error) {
      console.error('Error deleting garment:', error)
      alert('Error deleting the garment')
    }
  }

  const handleEdit = (prenda) => {
    setSelectedPrenda(prenda)
    setShowEditModal(true)
  }

  const tipos = ['all', 'superior', 'inferior', 'zapatos', 'abrigo', 'vestido']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen" style={{ background: 'var(--content-bg)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-4 sm:mb-0">
          My Garments
        </h1>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center space-x-2 shadow-lg"
        >
          <FaUpload />
          <span>Upload Garment</span>
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <FaFilter className="text-slate-400 mt-0.5" aria-hidden />
        {tipos.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setSelectedFilter(tipo)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all border-2 ${
              selectedFilter === tipo
                ? 'bg-white text-slate-900 border-white shadow-md'
                : 'bg-slate-600/80 text-slate-200 border-slate-500 hover:bg-slate-500 hover:text-white'
            }`}
          >
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-slate-500 border-t-slate-200"></div>
        </div>
      ) : fetchError ? (
        <div className="dashboard-card text-center py-12 rounded-xl border border-slate-500 shadow-sm">
          <p className="text-red-300 mb-2">{fetchError}</p>
          <button
            type="button"
            onClick={fetchPrendas}
            className="mt-2 px-4 py-2 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100"
          >
            Retry
          </button>
        </div>
      ) : filteredPrendas.length === 0 ? (
        <div className="dashboard-card text-center py-12 rounded-xl border border-slate-500 shadow-sm">
          <p className="text-slate-400">
            {selectedFilter === 'all'
              ? 'No garments yet. Upload your first garment!'
              : `No garments of type "${selectedFilter}"`}
          </p>
        </div>
      ) : (
        <div className="perspective-3d grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPrendas.map((prenda) => (
            <PrendaCard
              key={prenda._id}
              prenda={prenda}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchPrendas()
            setShowUploadModal(false)
          }}
        />
      )}

      {showEditModal && selectedPrenda && (
        <EditOcasionModal
          prenda={selectedPrenda}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPrenda(null)
          }}
          onSuccess={() => {
            fetchPrendas()
            setShowEditModal(false)
            setSelectedPrenda(null)
          }}
        />
      )}
    </div>
  )
}

export default MisPrendas

