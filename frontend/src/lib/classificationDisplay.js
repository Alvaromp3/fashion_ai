/**
 * Maps ML service Spanish labels to English for UI (ViT / color detection).
 */

export function typeToEnglish(raw) {
  if (raw == null || raw === '') return ''
  const map = {
    superior: 'TOP',
    inferior: 'BOTTOM',
    zapatos: 'SHOES',
    abrigo: 'COAT',
    vestido: 'DRESS',
    bolso: 'BAG',
    accesorio: 'ACCESSORY',
    'joyería': 'JEWELRY',
    joyeria: 'JEWELRY',
    sombrero: 'HAT',
    'cinturón': 'BELT',
    cinturon: 'BELT',
    gafas: 'GLASSES',
    desconocido: 'UNKNOWN',
  }
  const s = String(raw).toLowerCase().trim()
  return map[s] || String(raw).replace(/_/g, ' ').toUpperCase()
}

export function colorToEnglish(raw) {
  if (raw == null || raw === '') return ''
  const map = {
    desconocido: 'Unknown',
    negro: 'Black',
    blanco: 'White',
    gris: 'Gray',
    rojo: 'Red',
    'rojo oscuro': 'Dark red',
    azul: 'Blue',
    'azul oscuro': 'Dark blue',
    verde: 'Green',
    'verde oscuro': 'Dark green',
    amarillo: 'Yellow',
    'amarillo oscuro': 'Dark yellow',
    naranja: 'Orange',
    rosa: 'Pink',
    beige: 'Beige',
    marrón: 'Brown',
    marron: 'Brown',
    magenta: 'Magenta',
    multicolor: 'Multicolor',
  }
  const s = String(raw).toLowerCase().trim()
  return map[s] || String(raw)
}

/** Garment class name from model (underscores → spaces); unknown in English. */
export function garmentClassLabel(raw) {
  if (raw == null || raw === '') return 'Unknown'
  const s = String(raw).toLowerCase().trim()
  if (s === 'desconocido') return 'Unknown'
  return String(raw).replace(/_/g, ' ')
}

/** Stored occasion slugs (Spanish/English keys) → English labels for wardrobe UI. */
export function occasionToEnglish(raw) {
  if (raw == null || raw === '') return ''
  const map = {
    casual: 'Casual',
    formal: 'Formal',
    deportivo: 'Sporty',
    fiesta: 'Party',
    trabajo: 'Work',
  }
  const s = String(raw).toLowerCase().trim()
  return map[s] || String(raw).replace(/_/g, ' ')
}

/** Join occasion list/array into a single English string. */
export function formatOccasionsEnglish(raw) {
  if (raw == null || raw === '') return '—'
  const arr = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
  if (arr.length === 0) return '—'
  return arr.map(occasionToEnglish).join(', ')
}
