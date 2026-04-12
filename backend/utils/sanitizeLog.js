'use strict';

/**
 * Strip line breaks and cap length so log pipelines cannot be spoofed via CRLF injection.
 * @param {unknown} value
 * @param {number} [maxLen]
 * @returns {string}
 */
function sanitizeLog(value, maxLen = 2000) {
  if (value == null) return '';
  let s = String(value).replace(/[\r\n\u2028\u2029]/g, ' ');
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

module.exports = { sanitizeLog };
