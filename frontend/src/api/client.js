import axios from 'axios'

/** Base URL for API and uploads (e.g. https://your-backend.onrender.com). Empty = same origin (local dev). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/**
 * Token getter set by AuthTokenSetup (useAuth0().getAccessTokenSilently).
 * Request interceptor uses this to attach Bearer token to /api and /uploads.
 */
let authTokenGetter = null

export function setAuthTokenGetter(getter) {
  authTokenGetter = getter
}

axios.interceptors.request.use(
  async (config) => {
    const url = config.url || ''
    const isApi = url.startsWith('/api') || url.startsWith('/uploads')
    if (API_BASE_URL && isApi) {
      config.url = API_BASE_URL + url
    }
    if (!isApi || !authTokenGetter) return config
    try {
      const token = await authTokenGetter()
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // Not authenticated or token refresh failed; backend will respond 401 if required
    }
    return config
  }
)

export { axios }
export default axios
