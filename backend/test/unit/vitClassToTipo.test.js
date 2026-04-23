'use strict';

/** Integration: test/integration/classify.test.js, test/integration/classify-vit-base64-flow.test.js */

const { vitClassToTipo } = require('../../utils/vitClassToTipo');

describe('vitClassToTipo', () => {
  it('maps T-Shirt variant to superior', () => {
    expect(vitClassToTipo('T-Shirt')).toBe('superior');
  });

  it('maps sneaker to zapatos', () => {
    expect(vitClassToTipo('Sneaker')).toBe('zapatos');
  });

  it('maps underscore to hyphen', () => {
    expect(vitClassToTipo('ankle_boot')).toBe('zapatos');
  });

  it('returns desconocido for unknown', () => {
    expect(vitClassToTipo('spaceship')).toBe('desconocido');
  });

  it('returns desconocido for empty', () => {
    expect(vitClassToTipo('')).toBe('desconocido');
    expect(vitClassToTipo(null)).toBe('desconocido');
  });
});
