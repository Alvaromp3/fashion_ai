/**
 * Auth0 JWT middleware and helpers.
 * Requires AUTH0_DOMAIN and AUTH0_AUDIENCE in .env.
 * req.auth.payload.sub is the user id (e.g. auth0|xxx).
 */

const { auth } = require('express-oauth2-jwt-bearer');

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN?.trim();
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE?.trim();
const issuerBaseURL = AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN.replace(/^https?:\/\//, '')}` : null;

/** True if Auth0 is configured and API routes should require login */
const isAuthEnabled = Boolean(issuerBaseURL && AUTH0_AUDIENCE);

/**
 * JWT validation middleware (Auth0). Use only on routes that require login.
 * Sets req.auth.payload.sub (user id). Use getUserId(req) for a path-safe string.
 */
const jwtCheck = isAuthEnabled
  ? auth({
      issuerBaseURL,
      audience: AUTH0_AUDIENCE,
      tokenSigningAlg: 'RS256'
    })
  : null;

/**
 * Get user id from request (from JWT sub). Safe for use in file paths.
 * @param {import('express').Request} req - req.auth.payload.sub must be set
 * @returns {string} - Safe string for uploads/userId/ and DB
 */
function getUserId(req) {
  const sub = req.auth?.payload?.sub;
  if (!sub || typeof sub !== 'string') return '';
  return sub.replace(/[|/\\?:*"<>]/g, '_');
}

/**
 * Middleware: require Auth0. If auth is disabled, sets req.auth.payload.sub = 'anonymous' for dev.
 * If auth is enabled and no valid token, responds 401.
 */
function requireAuth(req, res, next) {
  if (!isAuthEnabled) {
    req.auth = { payload: { sub: 'anonymous' } };
    return next();
  }
  jwtCheck(req, res, (err) => {
    if (err) {
      return res.status(401).json({ error: 'Login required', message: err.message });
    }
    next();
  });
}

module.exports = {
  isAuthEnabled,
  jwtCheck,
  getUserId,
  requireAuth
};
