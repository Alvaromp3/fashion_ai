'use strict';

const { randomFileSuffix } = require('../../utils/randomFileSuffix');

describe('randomFileSuffix', () => {
  it('returns 16 hex chars', () => {
    const s = randomFileSuffix();
    expect(s).toMatch(/^[a-f0-9]{16}$/);
  });

  it('returns different values', () => {
    const a = randomFileSuffix();
    const b = randomFileSuffix();
    expect(a).not.toBe(b);
  });
});
