import { useState } from 'react'
import { FaTimes, FaCalendar, FaSpinner } from 'react-icons/fa'
import axios from 'axios'

const EditOcasionModal = ({ prenda, onClose, onSuccess }) => {
  const initialOcasiones = Array.isArray(prenda?.ocasion) 
    ? prenda.ocasion 
    : prenda?.ocasion 
      ? [prenda.ocasion] 
      : []
  const [selectedOccasions, setSelectedOccasions] = useState(initialOcasiones)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const occasions = [
    { value: 'casual', label: 'Casual', icon: '👕', desc: 'For everyday wear' },
    { value: 'formal', label: 'Formal', icon: '👔', desc: 'Important events' },
    { value: 'deportivo', label: 'Sporty', icon: '🏃', desc: 'Exercise and activity' },
    { value: 'fiesta', label: 'Party', icon: '🎉', desc: 'Celebrations' },
    { value: 'trabajo', label: 'Work', icon: '💼', desc: 'Professional office' }
  ]

  const toggleOccasion = (occasionValue) => {
    setSelectedOccasions(prev => {
      if (prev.includes(occasionValue)) {
        return prev.filter(oc => oc !== occasionValue)
      } else {
        return [...prev, occasionValue]
      }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      await axios.put(`/api/prendas/${prenda._id}/ocasion`, {
        ocasion: selectedOccasions
      })

      onSuccess()
    } catch (error) {
      console.error('Error updating occasion:', error)
      setError('Error updating the occasion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-large max-w-lg w-full border border-gray-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <FaCalendar className="text-gray-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Edit Occasion</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-gray-900">Garment:</span> {prenda?.clase_nombre || 'unknown'}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Type:</span> {prenda?.tipo}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select the occasions for this garment (you can choose multiple)
            </label>
            <p className="text-xs text-gray-500 mb-4">
              {selectedOccasions.length > 0 
                ? `${selectedOccasions.length} occasion${selectedOccasions.length > 1 ? 's' : ''} selected`
                : 'No occasions selected'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {occasions.map(oc => {
                const isSelected = selectedOccasions.includes(oc.value)
                return (
                  <button
                    key={oc.value}
                    onClick={() => toggleOccasion(oc.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left relative ${
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-soft'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <div className={`w-5 h-5 rounded border-2 mr-2 flex items-center justify-center ${
                        isSelected 
                          ? 'bg-white border-white' 
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-2xl mr-2">{oc.icon}</span>
                      <span className="font-medium text-sm">{oc.label}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                      {oc.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditOcasionModal

