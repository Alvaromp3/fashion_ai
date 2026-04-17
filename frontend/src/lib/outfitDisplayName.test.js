import { describe, it, expect } from 'vitest'
import { getOutfitDisplayName } from './outfitDisplayName'

describe('getOutfitDisplayName', () => {
  it('uses first explanation when valid', () => {
    const o = { explicaciones: ['Nice combo for work'] }
    expect(getOutfitDisplayName(o, 0)).toBe('Nice combo for work')
  })

  it('skips Perfect for prefix', () => {
    const o = { explicaciones: ['Perfect for casual'], superior: { clase_nombre: 'Shirt' } }
    expect(getOutfitDisplayName(o, 0)).toContain('Shirt')
  })

  it('joins garment names when no explanation', () => {
    const o = {
      superior: { clase_nombre: 'Top' },
      inferior: { clase_nombre: 'Jeans' }
    }
    expect(getOutfitDisplayName(o, 1)).toContain('Top')
    expect(getOutfitDisplayName(o, 1)).toContain('Jeans')
  })

  it('falls back to suggestion index', () => {
    expect(getOutfitDisplayName({}, 2)).toBe('Suggestion 3')
  })
})
