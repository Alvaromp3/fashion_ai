const { auth } = require('express-oauth2-jwt-bearer');

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

/**
 * JWT validation middleware. Validates Auth0 access tokens and sets req.auth.
 * Requires AUTH0_DOMAIN and AUTH0_AUDIENCE in env.
 */
const checkJwt = auth({
  issuerBaseURL: domain ? `https://${domain}` : undefined,
  audience: audience || undefined
});

/**
 * Maps req.auth.payload.sub to req.user for use in routes.
 * Must be used after checkJwt.
 */
function setUser(req, res, next) {
  if (req.auth && req.auth.payload && req.auth.payload.sub) {
    req.user = { sub: req.auth.payload.sub };
  }
  next();
}

/**
 * Roles claim name in the JWT (e.g. "https://your-api/roles" or "roles").
 * Set AUTH0_ROLES_CLAIM in env if your token uses a different claim.
 */
const ROLES_CLAIM = process.env.AUTH0_ROLES_CLAIM || 'https://fashion-ai-api/roles';

/**
 * Returns true if the request has an admin role in the token.
 * Must be used after requireAuth (checkJwt + setUser).
 */
function isAdmin(req) {
  const payload = req.auth && req.auth.payload;
  if (!payload) return false;
  const roles = payload[ROLES_CLAIM];
  if (!Array.isArray(roles)) return false;
  return roles.includes('admin');
}

/**
 * Requires the user to have the admin role. Returns 403 otherwise.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(403).json({ error: 'Admin access required' });
}

module.exports = {
  checkJwt,
  setUser,
  requireAuth: [checkJwt, setUser],
  requireAdmin,
  ROLES_CLAIM,
  isAdmin
};
