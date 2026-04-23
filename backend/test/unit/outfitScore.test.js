'use strict';

/**
 * Traceability: FR-2 — scoreOutfitCompatibility() (utils/outfitScore.js)
 */

const { scoreOutfitCompatibility } = require('../../utils/outfitScore');

function piece(overrides) {
  return {
    clase_nombre: 'T-shirt',
    color: 'negro',
    ...overrides
  };
}

describe('scoreOutfitCompatibility (IT-A3 / FR-2)', () => {
  it('returns puntuacion clamped to [38, 97]', () => {
    const low = scoreOutfitCompatibility(
      piece({ clase_nombre: 'T-shirt', color: 'x' }),
      null,
      piece({ tipo: 'inferior', clase_nombre: 'Trouser', color: 'y' }),
      piece({ tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'z' }),
      {},
      'low-key'
    );
    expect(low.puntuacion).toBeGreaterThanOrEqual(38);
    expect(low.puntuacion).toBeLessThanOrEqual(97);

    const high = scoreOutfitCompatibility(
      piece({ clase_nombre: 'Shirt', color: 'blanco' }),
      null,
      piece({ tipo: 'inferior', clase_nombre: 'Trouser', color: 'negro' }),
      piece({ tipo: 'zapatos', clase_nombre: 'Ankle_boot', color: 'negro' }),
      { colores: ['negro'], ocasion: 'formal', estilo: 'elegante' },
      'high-key-xxxxxxxx'
    );
    expect(high.puntuacion).toBeGreaterThanOrEqual(38);
    expect(high.puntuacion).toBeLessThanOrEqual(97);
  });

  it('returns non-empty explicaciones', () => {
    const { explicaciones } = scoreOutfitCompatibility(
      piece({ clase_nombre: 'T-shirt', color: 'azul' }),
      null,
      piece({ tipo: 'inferior', clase_nombre: 'Trouser', color: 'blanco' }),
      piece({ tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'negro' }),
      {},
      'combo-1'
    );
    expect(Array.isArray(explicaciones)).toBe(true);
    expect(explicaciones.length).toBeGreaterThan(0);
    expect(explicaciones.every((e) => typeof e === 'string' && e.length > 0)).toBe(true);
  });

  it('adds formal-occasion explanation when ocasion=formal and top is Pullover', () => {
    const { explicaciones } = scoreOutfitCompatibility(
      piece({ clase_nombre: 'Pullover', color: 'gris' }),
      null,
      piece({ tipo: 'inferior', clase_nombre: 'Trouser', color: 'negro' }),
      piece({ tipo: 'zapatos', clase_nombre: 'Sneaker', color: 'blanco' }),
      { ocasion: 'formal' },
      'formal-pullover'
    );
    const joined = explicaciones.join(' ').toLowerCase();
    expect(joined).toContain('formal');
    expect(joined).toContain('occasion');
  });
});
