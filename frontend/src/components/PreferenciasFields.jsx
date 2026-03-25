import { Palette, CalendarDays, Sparkles, Layers } from 'lucide-react'

export const defaultOutfitPreferencias = {
  colores: [],
  ocasion: '',
  estilo: '',
  incluirVestido: false,
  incluirAbrigo: false,
  topPreference: 'any',
  layeredTop: false,
  style_preference: ''
}

/** Strip API payload down to outfit fields only (avoids sending age/context on Generate save). */
export function pickOutfitFromApi(obj) {
  if (!obj || typeof obj !== 'object') {
    return { ...defaultOutfitPreferencias }
  }
  return {
    ...defaultOutfitPreferencias,
    colores: Array.isArray(obj.colores) ? obj.colores : [],
    ocasion: typeof obj.ocasion === 'string' ? obj.ocasion : '',
    estilo: typeof obj.estilo === 'string' ? obj.estilo : '',
    incluirVestido: Boolean(obj.incluirVestido),
    incluirAbrigo: Boolean(obj.incluirAbrigo),
    topPreference: typeof obj.topPreference === 'string' ? obj.topPreference : 'any',
    layeredTop: Boolean(obj.layeredTop),
    style_preference: typeof obj.style_preference === 'string' ? obj.style_preference : ''
  }
}

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

function summarizeColors(values) {
  if (!values?.length) return '—'
  return values
    .map((v) => coloresDisponibles.find((c) => c.value === v)?.label || v)
    .join(', ')
}

function summarizePreferenciasReadOnly(preferencias) {
  const oc = occasions.find((o) => o.value === preferencias.ocasion)
  const st = styles.find((s) => s.value === preferencias.estilo)
  const top = topOptions.find((t) => t.value === preferencias.topPreference)
  return {
    colours: summarizeColors(preferencias.colores),
    occasion: oc?.label || preferencias.ocasion || '—',
    style: st?.label || preferencias.estilo || '—',
    styleNotes: (preferencias.style_preference || '').trim() || '—',
    composition: preferencias.layeredTop
      ? '4 pieces (layered top)'
      : `3 pieces · ${top?.label || preferencias.topPreference || '—'}`,
    dress: preferencias.incluirVestido ? 'Yes' : 'No',
    coat: preferencias.incluirAbrigo ? 'Yes' : 'No'
  }
}

/**
 * Shared outfit preference controls (Generate modal + Settings).
 * @param {{ value: object, onChange?: import('react').Dispatch<import('react').SetStateAction<object>>, readOnly?: boolean }} props
 */
export function PreferenciasFields({ value: preferencias, onChange: setPreferencias, readOnly }) {
  if (readOnly) {
    const s = summarizePreferenciasReadOnly(preferencias)
    const rows = [
      ['Preferred colours', s.colours],
      ['Occasion', s.occasion],
      ['Style', s.style],
      ['Style notes', s.styleNotes],
      ['Composition', s.composition],
      ['Include dresses', s.dress],
      ['Include coat', s.coat]
    ]
    return (
      <dl className="space-y-3">
        {rows.map(([dt, dd]) => (
          <div key={dt}>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#888]">{dt}</dt>
            <dd className="mt-1 text-sm text-[#0D0D0D] whitespace-pre-wrap break-words">{dd}</dd>
          </div>
        ))}
      </dl>
    )
  }

  const toggleColor = (colorValue) => {
    setPreferencias((prev) => ({
      ...prev,
      colores: prev.colores.includes(colorValue)
        ? prev.colores.filter((c) => c !== colorValue)
        : [...prev.colores, colorValue]
    }))
  }

  return (
    <div className="space-y-8">
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

      <section>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Occasion</h3>
        </div>
        <p className="text-slate-500 text-sm mb-3">What is the outfit for?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {occasions.map((oc) => (
            <button
              key={oc.value}
              type="button"
              onClick={() => setPreferencias((prev) => ({ ...prev, ocasion: oc.value }))}
              className={`py-3 px-4 rounded-lg border-2 text-left transition-all ${
                preferencias.ocasion === oc.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium text-sm block">{oc.label}</span>
              <span
                className={`text-xs mt-0.5 block ${
                  preferencias.ocasion === oc.value ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {oc.desc}
              </span>
            </button>
          ))}
        </div>
      </section>

      <hr className="border-slate-100" />

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Style</h3>
        </div>
        <p className="text-slate-500 text-sm mb-3">Preferred look.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {styles.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setPreferencias((prev) => ({ ...prev, estilo: s.value }))}
              className={`py-3 px-4 rounded-lg border-2 text-center transition-all ${
                preferencias.estilo === s.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium text-sm block">{s.label}</span>
              <span
                className={`text-xs mt-0.5 block ${
                  preferencias.estilo === s.value ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {s.desc}
              </span>
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium text-slate-700 mt-4 mb-2">Free-text style preference</label>
        <textarea
          value={preferencias.style_preference || ''}
          onChange={(e) => setPreferencias((prev) => ({ ...prev, style_preference: e.target.value }))}
          placeholder="e.g. minimal smart casual, no logos"
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800/20 resize-y min-h-[2.5rem]"
        />
      </section>

      <hr className="border-slate-100" />

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
            onClick={() => setPreferencias((prev) => ({ ...prev, layeredTop: false, topPreference: prev.topPreference }))}
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
            onClick={() => setPreferencias((prev) => ({ ...prev, layeredTop: true }))}
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
              {topOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPreferencias((prev) => ({ ...prev, topPreference: opt.value }))}
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
              onChange={(e) => setPreferencias((prev) => ({ ...prev, incluirVestido: e.target.checked }))}
              className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
            />
            <span className="text-sm text-slate-700">Include dresses in recommendations</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferencias.incluirAbrigo}
              onChange={(e) => setPreferencias((prev) => ({ ...prev, incluirAbrigo: e.target.checked }))}
              className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
            />
            <span className="text-sm text-slate-700">Include coat when available</span>
          </label>
        </div>
      </section>
    </div>
  )
}
