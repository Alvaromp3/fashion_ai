/**
 * Auth0 redirect/return URL: local dev uses localhost, production never uses localhost.
 * Use this for redirect_uri and returnTo so login/logout always go to the right place.
 */
export function getRedirectOrigin() {
  const fromEnv = (import.meta.env.VITE_AUTH0_CALLBACK_URL || '').replace(/\/$/, '')
  const isLocalhost = (url) => {
    try {
      const u = new URL(url)
      return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    } catch {
      return false
    }
  }
  const current = window.location.origin

  if (isLocalhost(current)) return current
  if (fromEnv && !isLocalhost(fromEnv)) return fromEnv
  return current
}
