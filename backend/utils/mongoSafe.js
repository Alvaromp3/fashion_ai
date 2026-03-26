/**
 * Hardening against NoSQL injection: never pass unvalidated request data as query keys.
 * @see https://owasp.org/www-community/attacks/NoSQL_Injection
 */

const mongoose = require('mongoose');

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

/**
 * @param {unknown} value
 * @returns {mongoose.Types.ObjectId | null}
 */
function parseObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value !== 'string' || !OBJECT_ID_HEX.test(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

/**
 * Auth0 `sub` and similar string ids — reject objects/arrays so operators cannot be injected.
 * @param {unknown} value
 * @returns {string | null}
 */
function parseAuthSubject(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.length > 512) return null;
  return value;
}

/**
 * Filter document for string user id field (e.g. user_id, userId) using $eq.
 * @param {string} field
 * @param {unknown} value
 * @returns {Record<string, { $eq: string }> | null} null if value is not a safe string
 */
function filterEqString(field, value) {
  const s = parseAuthSubject(value);
  if (!s) return null;
  return { [field]: { $eq: s } };
}

module.exports = {
  parseObjectId,
  parseAuthSubject,
  filterEqString
};
