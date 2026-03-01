import './api/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { TubelightNavbar } from './components/ui/tubelight-navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { AuthTokenSetup } from './components/AuthTokenSetup'
import { useAuth0 } from '@auth0/auth0-react'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import MisPrendas from './pages/MisPrendas'
import MisOutfits from './pages/MisOutfits'
import Admin from './pages/Admin'
import Mirror from './pages/Mirror'

function LandingOrRedirect() {
  const { isAuthenticated, isLoading } = useAuth0()
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--content-bg)' }}>
        <div className="w-10 h-10 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      </div>
    )
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Index />
}

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }

function App() {
  return (
    <Router future={routerFuture}>
      <div
        className="min-h-screen app-shell"
        style={{ background: 'var(--content-bg)' }}
      >
        <TubelightNavbar />
        <AuthTokenSetup />
        <div className="pb-24 sm:pb-0 sm:pt-20">
          <Routes>
            <Route path="/" element={<LandingOrRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/prendas" element={<ProtectedRoute><MisPrendas /></ProtectedRoute>} />
            <Route path="/outfits" element={<ProtectedRoute><MisOutfits /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/modelo/confusion-matrix" element={<Navigate to="/admin" replace />} />
            <Route path="/modelo/ejemplos" element={<Navigate to="/admin" replace />} />
            <Route path="/mirror" element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

