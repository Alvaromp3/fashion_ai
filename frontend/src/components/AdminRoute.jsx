import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldX } from 'lucide-react'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { ProtectedRoute } from './ProtectedRoute'

/**
 * Renders children only when the user is authenticated and has the admin role.
 * Otherwise shows login (via ProtectedRoute) or "Access denied".
 */
export function AdminRoute({ children }) {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth0()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (!isAuthenticated) {
    return <ProtectedRoute>{children}</ProtectedRoute>
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--content-bg)' }}>
        <div className="text-slate-400 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-500 border-t-slate-200 mx-auto mb-3" />
          <div className="animate-pulse">Loading…</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ background: 'var(--content-bg)' }}>
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 rounded-2xl bg-slate-700/80 border border-slate-600 mb-4">
            <ShieldX className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Access denied</h1>
          <p className="text-slate-400 mb-6">
            You need the admin role to view this page.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return children
}
