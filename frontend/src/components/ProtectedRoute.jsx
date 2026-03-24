import { useAuth0 } from '@auth0/auth0-react'

/**
 * Renders children when authenticated; otherwise shows login prompt and button.
 * Use to wrap route elements that require a logged-in user.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--content-bg)' }}>
        <div className="text-slate-400 text-center">
          <div className="animate-pulse">Loading…</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ background: 'var(--content-bg)' }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Log in to continue</h1>
          <p className="text-slate-400 mb-6">
            Sign in to manage your wardrobe, save outfits, and use the Mirror.
          </p>
          <button
            type="button"
            onClick={() => loginWithRedirect()}
            className="px-6 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    )
  }

  return children
}
