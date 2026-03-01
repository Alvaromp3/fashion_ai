import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'

/**
 * Returns { isAdmin, loading, error } using GET /api/me (roles from token).
 * Use for conditional Admin nav and route guard.
 */
export function useIsAdmin() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setIsAdmin(false)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const run = async () => {
      try {
        await getAccessTokenSilently()
        const res = await axios.get('/api/me', { timeout: 5000 })
        if (!cancelled) {
          setIsAdmin(Boolean(res.data?.isAdmin))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setIsAdmin(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [isAuthenticated, getAccessTokenSilently])

  return { isAdmin, loading, error }
}
