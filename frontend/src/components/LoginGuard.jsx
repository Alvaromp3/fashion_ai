import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'
import axios from 'axios'

/**
 * Renders children only when the user is logged in.
 * Shows a login screen otherwise and attaches the access token to axios.
 */
export function LoginGuard({ children }) {
  const { isAuthenticated, isLoading, error, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const [loginError, setLoginError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      delete axios.defaults.headers.common['Authorization']
      return
    }
    let cancelled = false
    getAccessTokenSilently()
      .then((token) => {
        if (!cancelled) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      })
      .catch((err) => {
        if (!cancelled) {
          delete axios.defaults.headers.common['Authorization']
          setLoginError(err?.message || 'Could not get token')
        }
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getAccessTokenSilently])

  const handleLogin = () => {
    setLoginError(null)
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    }).catch((err) => {
      setLoginError(err?.message || 'Login failed')
    })
  }

  const authError = error?.message || loginError

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e293b]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e293b] px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Fashion AI</h1>
          <p className="text-zinc-400 text-sm mb-6">Log in to access your wardrobe and outfits.</p>
          {authError && (
            <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">
              {authError}
            </p>
          )}
          {authError && authError.includes('fashion-api') && (
            <p className="mb-4 text-xs text-zinc-400">
              In Auth0: left menu <strong>APIs</strong> → <strong>Create API</strong> → Identifier = <code className="bg-zinc-800 px-1 rounded">https://fashion-api</code>. See AUTH0-CHECKLIST.md.
            </p>
          )}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-lg bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors"
          >
            Log in
          </button>
          <p className="mt-6 text-xs text-zinc-500">
            If login fails, in Auth0 Dashboard → Application → Settings set Allowed Callback URLs to <code className="bg-zinc-800 px-1 rounded">http://localhost:3000</code> and Application Type to Single Page Application.
          </p>
        </div>
      </div>
    )
  }

  return children
}
