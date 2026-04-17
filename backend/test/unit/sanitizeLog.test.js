'use strict';

const { sanitizeLog } = require('../../utils/sanitizeLog');

describe('sanitizeLog', () => {
  it('returns empty for null', () => {
    expect(sanitizeLog(null)).toBe('');
  });

  it('replaces newlines', () => {
    expect(sanitizeLog('a\r\nb')).toBe('a  b');
  });

  it('truncates to maxLen', () => {
    const s = sanitizeLog('0123456789', 5);
    expect(s).toBe('01234…');
  });
});
