import OutfitCard from './OutfitCard'

const CompareOutfitsModal = ({ outfitA, outfitB, onClose }) => {
  if (!outfitA || !outfitB) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Comparar outfits</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Outfit 1</p>
            <OutfitCard outfit={outfitA} showPuntuacion showPorQueCombina />
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Outfit 2</p>
            <OutfitCard outfit={outfitB} showPuntuacion showPorQueCombina />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompareOutfitsModal
