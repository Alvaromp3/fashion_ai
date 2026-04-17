import { describe, it, expect } from 'vitest'
import { pieceId, getOutfitId, getComboKey, buildSaveOutfitPayload } from './outfitHelpers'

describe('outfitHelpers', () => {
  it('pieceId prefers obj._id', () => {
    expect(pieceId({ _id: 'a' }, 'b')).toBe('a')
  })

  it('getOutfitId joins ids', () => {
    const outfit = {
      superior: { _id: 's1' },
      inferior_id: 'i1',
      zapatos: { _id: 'z1' }
    }
    expect(getOutfitId(outfit)).toBe('s1-i1-z1')
  })

  it('getComboKey requires s,i,z', () => {
    expect(getComboKey({ superior: { _id: 's' } })).toBe('')
  })

  it('buildSaveOutfitPayload returns null when incomplete', () => {
    expect(buildSaveOutfitPayload(null)).toBeNull()
    expect(buildSaveOutfitPayload({ superior_id: 'a' })).toBeNull()
  })

  it('buildSaveOutfitPayload builds body', () => {
    const body = buildSaveOutfitPayload({
      superior_id: 's',
      inferior_id: 'i',
      zapatos_id: 'z',
      puntuacion: 80
    })
    expect(body).toMatchObject({
      superior_id: 's',
      inferior_id: 'i',
      zapatos_id: 'z',
      puntuacion: 80
    })
  })
})
