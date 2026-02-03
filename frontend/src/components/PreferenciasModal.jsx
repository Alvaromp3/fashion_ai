import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { Palette, CalendarDays, Sparkles, Layers } from 'lucide-react'

const PreferenciasModal = ({ isOpen, onClose, onGenerate }) => {
  const [preferencias, setPreferencias] = useState({
    colores: [],
    ocasion: '',
    estilo: '',
    incluirVestido: false,
    incluirAbrigo: false,
    topPreference: 'any',
    layeredTop: false
  })

  const coloresDisponibles = [
    { value: 'negro', label: 'Black' },
    { value: 'blanco', label: 'White' },
    { value: 'gris', label: 'Gray' },
    { value: 'rojo', label: 'Red' },
    { value: 'azul', label: 'Blue' },
    { value: 'verde', label: 'Green' },
    { value: 'amarillo', label: 'Yellow' },
    { value: 'naranja', label: 'Orange' },
    { value: 'rosa', label: 'Pink' },
    { value: 'beige', label: 'Beige' },
    { value: 'marrón', label: 'Brown' }
  ]

  const occasions = [
    { value: 'casual', label: 'Casual', desc: 'Everyday wear' },
    { value: 'formal', label: 'Formal', desc: 'Important events' },
    { value: 'deportivo', label: 'Sporty', desc: 'Exercise and activity' },
    { value: 'fiesta', label: 'Party', desc: 'Celebrations' },
    { value: 'trabajo', label: 'Work', desc: 'Professional office' }
  ]

  const styles = [
    { value: 'minimalista', label: 'Minimalist', desc: 'Neutral colours' },
    { value: 'colorido', label: 'Colorful', desc: 'Vibrant colours' },
    { value: 'elegante', label: 'Elegant', desc: 'Sophisticated' },
    { value: 'moderno', label: 'Modern', desc: 'Current trend' }
  ]

  const topOptions = [
    { value: 'any', label: 'Any (T-shirt or pullover)' },
    { value: 'tshirt', label: 'T-shirt only' },
    { value: 'pullover', label: 'Pullover only' }
  ]

  const toggleColor = (colorValue) => {
    setPreferencias(prev => ({
      ...prev,
      colores: prev.colores.includes(colorValue)
        ? prev.colores.filter(c => c !== colorValue)
        : [...prev.colores, colorValue]
    }))
  }

  const handleGenerate = () => {
    onGenerate(preferencias)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Outfit preferences</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg">
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Preferred colours */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Preferred colours</h3>
            </div>
            <p className="text-slate-500 text-sm mb-3">Optional. Selected colours may appear in suggestions.</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {coloresDisponibles.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleColor(value)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    preferencias.colores.includes(value)
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Occasion */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Occasion</h3>
            </div>
            <p className="text-slate-500 text-sm mb-3">What is the outfit for?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {occasions.map(oc => (
                <button
                  key={oc.value}
                  type="button"
                  onClick={() => setPreferencias(prev => ({ ...prev, ocasion: oc.value }))}
                  className={`py-3 px-4 rounded-lg border-2 text-left transition-all ${
                    preferencias.ocasion === oc.value
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium text-sm block">{oc.label}</span>
                  <span className={`text-xs mt-0.5 block ${preferencias.ocasion === oc.value ? 'text-white/80' : 'text-slate-500'}`}>{oc.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Style */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Style</h3>
            </div>
            <p className="text-slate-500 text-sm mb-3">Preferred look.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {styles.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPreferencias(prev => ({ ...prev, estilo: s.value }))}
                  className={`py-3 px-4 rounded-lg border-2 text-center transition-all ${
                    preferencias.estilo === s.value
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium text-sm block">{s.label}</span>
                  <span className={`text-xs mt-0.5 block ${preferencias.estilo === s.value ? 'text-white/80' : 'text-slate-500'}`}>{s.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Outfit composition */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Outfit composition</h3>
            </div>
            <p className="text-slate-500 text-sm mb-3">Choose how many pieces you want in each outfit.</p>

            <label className="block text-sm font-medium text-slate-700 mb-2">Outfit type</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPreferencias(prev => ({ ...prev, layeredTop: false, topPreference: prev.topPreference }))}
                className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  !preferencias.layeredTop
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                3 pieces (one top + trousers + sneakers)
              </button>
              <button
                type="button"
                onClick={() => setPreferencias(prev => ({ ...prev, layeredTop: true }))}
                className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  preferencias.layeredTop
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                4 pieces (pullover + T-shirt + trousers + sneakers)
              </button>
            </div>

            {!preferencias.layeredTop && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-2">Top (when 3 pieces)</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {topOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPreferencias(prev => ({ ...prev, topPreference: opt.value }))}
                      className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        preferencias.topPreference === opt.value
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferencias.incluirVestido}
                  onChange={(e) => setPreferencias(prev => ({ ...prev, incluirVestido: e.target.checked }))}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <span className="text-sm text-slate-700">Include dresses in recommendations</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferencias.incluirAbrigo}
                  onChange={(e) => setPreferencias(prev => ({ ...prev, incluirAbrigo: e.target.checked }))}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <span className="text-sm text-slate-700">Include coat when available</span>
              </label>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleGenerate} className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Generate 3 outfits
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreferenciasModal
