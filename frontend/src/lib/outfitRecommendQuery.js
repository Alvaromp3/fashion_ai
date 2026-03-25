/**
 * Query string for GET /api/outfits/recommend (same shape as Generate page).
 * @param {object} prefs - outfitGeneration from chat or preferences modal
 * @param {string[]} [excludeKeys] - combo keys to exclude
 */
export function outfitRecommendSearchParams(prefs, excludeKeys = []) {
  const params = new URLSearchParams()
  if (!prefs || typeof prefs !== 'object') return params
  if (prefs.colores?.length) params.append('colores', JSON.stringify(prefs.colores))
  if (prefs.ocasion) params.append('ocasion', prefs.ocasion)
  if (prefs.estilo) params.append('estilo', prefs.estilo)
  if (prefs.incluirVestido) params.append('incluirVestido', 'true')
  if (prefs.topPreference && prefs.topPreference !== 'any') params.append('topPreference', prefs.topPreference)
  if (prefs.incluirAbrigo) params.append('incluirAbrigo', 'true')
  if (prefs.layeredTop) params.append('layeredTop', 'true')
  if (excludeKeys.length) params.append('exclude', excludeKeys.join(','))
  return params
}

export function outfitRecommendUrl(prefs, excludeKeys = []) {
  const p = outfitRecommendSearchParams(prefs, excludeKeys)
  const q = p.toString()
  return q ? `/api/outfits/recommend?${q}` : '/api/outfits/recommend'
}
