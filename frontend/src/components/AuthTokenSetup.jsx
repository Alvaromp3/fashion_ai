import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { setAuthTokenGetter } from '../api/client'

/**
 * Sets the Auth0 token getter on the API client so axios requests
 * include the Bearer token. Must be mounted inside Auth0Provider.
 */
export function AuthTokenSetup() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthTokenGetter(null)
      return
    }
    setAuthTokenGetter(() => getAccessTokenSilently())
    return () => setAuthTokenGetter(null)
  }, [getAccessTokenSilently, isAuthenticated])

  return null
}
