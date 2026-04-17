import { describe, it, expect } from 'vitest'
import {
  typeToEnglish,
  colorToEnglish,
  garmentClassLabel,
  occasionToEnglish,
  formatOccasionsEnglish
} from './classificationDisplay'

describe('classificationDisplay', () => {
  it('typeToEnglish maps known tipo', () => {
    expect(typeToEnglish('superior')).toBe('TOP')
    expect(typeToEnglish('desconocido')).toBe('UNKNOWN')
  })

  it('colorToEnglish maps known color', () => {
    expect(colorToEnglish('azul')).toBe('Blue')
    expect(colorToEnglish('desconocido')).toBe('Unknown')
  })

  it('garmentClassLabel handles unknown', () => {
    expect(garmentClassLabel('desconocido')).toBe('Unknown')
    expect(garmentClassLabel('Ankle_boot')).toBe('Ankle boot')
  })

  it('occasionToEnglish maps slug', () => {
    expect(occasionToEnglish('trabajo')).toBe('Work')
  })

  it('formatOccasionsEnglish joins array', () => {
    expect(formatOccasionsEnglish(['casual', 'formal'])).toContain('Casual')
  })
})
