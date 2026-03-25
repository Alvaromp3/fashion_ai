import { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import { PreferenciasFields, defaultOutfitPreferencias, pickOutfitFromApi } from './PreferenciasFields'

const PreferenciasModal = ({ isOpen, onClose, onGenerate, initialPreferences, onSave }) => {
  const [preferencias, setPreferencias] = useState(defaultOutfitPreferencias)

  useEffect(() => {
    if (isOpen && initialPreferences) {
      setPreferencias(pickOutfitFromApi(initialPreferences))
    }
  }, [isOpen, initialPreferences])

  const handleGenerate = () => {
    onGenerate(preferencias)
    if (onSave) onSave(preferencias)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Outfit preferences</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="p-6">
          <PreferenciasFields value={preferencias} onChange={setPreferencias} />
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Generate 3 outfits
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreferenciasModal
