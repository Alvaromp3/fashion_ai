'use strict';

/**
 * parseAuthSubject — integration: test/integration/me.test.js
 * parseObjectId / filterEqString — routes/prendas.js, outfits.js (no dedicated integration test yet)
 */

const { parseObjectId, parseAuthSubject, filterEqString } = require('../../utils/mongoSafe');

describe('mongoSafe.parseObjectId', () => {
  it('returns null for invalid hex', () => {
    expect(parseObjectId('not-an-id')).toBeNull();
  });

  it('parses 24-char hex', () => {
    const id = parseObjectId('507f1f77bcf86cd799439011');
    expect(id).toBeTruthy();
    expect(String(id)).toBe('507f1f77bcf86cd799439011');
  });
});

describe('mongoSafe.parseAuthSubject', () => {
  it('returns null for object injection attempt', () => {
    expect(parseAuthSubject({ $gt: '' })).toBeNull();
  });

  it('returns string for normal sub', () => {
    expect(parseAuthSubject('auth0|123')).toBe('auth0|123');
  });
});

describe('mongoSafe.filterEqString', () => {
  it('returns $eq filter for safe string', () => {
    const f = filterEqString('user_id', 'u1');
    expect(f).toEqual({ user_id: { $eq: 'u1' } });
  });

  it('returns null for bad value', () => {
    expect(filterEqString('user_id', null)).toBeNull();
  });
});
