/**
 * Short label for list rows: first explanation line if usable, else garment names.
 */
export function getOutfitDisplayName(outfit, suggestionIndex) {
  const explicaciones = outfit?.explicaciones || []
  const first = explicaciones[0]
  if (first && typeof first === 'string' && !first.startsWith('Perfect for ')) {
    const t = first.trim()
    if (t.length > 0 && t.length <= 80) return t
  }
  const parts = []
  const push = (p) => {
    if (p?.clase_nombre) parts.push(p.clase_nombre)
  }
  push(outfit?.superior_id || outfit?.superior)
  push(outfit?.superior_secundario_id || outfit?.superiorSecundario)
  push(outfit?.inferior_id || outfit?.inferior)
  push(outfit?.zapatos_id || outfit?.zapatos)
  push(outfit?.abrigo_id || outfit?.abrigo)
  if (parts.length) return parts.join(' · ')
  return typeof suggestionIndex === 'number' ? `Suggestion ${suggestionIndex + 1}` : 'Outfit'
}
