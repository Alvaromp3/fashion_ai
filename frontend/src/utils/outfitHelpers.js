export const pieceId = (obj, rawId) => {
  if (obj?._id) return obj._id
  if (rawId?._id) return rawId._id
  return rawId
}

export const getOutfitId = (outfit) =>
  [
    pieceId(outfit.superior, outfit.superior_id),
    pieceId(outfit.superiorSecundario, outfit.superior_secundario_id),
    pieceId(outfit.inferior, outfit.inferior_id),
    pieceId(outfit.zapatos, outfit.zapatos_id),
    pieceId(outfit.abrigo, outfit.abrigo_id)
  ]
    .filter(Boolean)
    .join('-')

export const getComboKey = (outfit) => {
  const s = pieceId(outfit.superior, outfit.superior_id)
  const s2 = pieceId(outfit.superiorSecundario, outfit.superior_secundario_id)
  const i = pieceId(outfit.inferior, outfit.inferior_id)
  const z = pieceId(outfit.zapatos, outfit.zapatos_id)
  if (!s || !i || !z) return ''
  return s2 ? `${s}-${s2}-${i}-${z}` : `${s}-${i}-${z}`
}

/** Body for POST /api/outfits/save (recommendations or populated outfit). */
export const buildSaveOutfitPayload = (outfit) => {
  if (!outfit) return null
  const superior = outfit.superior ?? outfit.superior_id
  const inferior = outfit.inferior ?? outfit.inferior_id
  const zapatos = outfit.zapatos ?? outfit.zapatos_id
  const superior_id = superior?._id ?? superior
  const inferior_id = inferior?._id ?? inferior
  const zapatos_id = zapatos?._id ?? zapatos
  if (!superior_id || !inferior_id || !zapatos_id) return null
  const body = {
    superior_id,
    inferior_id,
    zapatos_id,
    puntuacion: outfit.puntuacion ?? 50
  }
  const s2 = outfit.superiorSecundario ?? outfit.superior_secundario_id
  const sid2 = s2?._id ?? s2
  if (sid2) body.superior_secundario_id = sid2
  const abr = outfit.abrigo ?? outfit.abrigo_id
  const abid = abr?._id ?? abr
  if (abid) body.abrigo_id = abid
  return body
}
