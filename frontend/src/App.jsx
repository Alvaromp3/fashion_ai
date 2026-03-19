import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { TubelightNavbar } from './components/ui/tubelight-navbar'
import { AuthTokenSetup } from './components/AuthTokenSetup'
import { getRedirectOrigin } from './utils/auth0Redirect'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }

const Dashboard = lazy(() => import('./pages/Dashboard'))
const MisPrendas = lazy(() => import('./pages/MisPrendas'))
const MisOutfits = lazy(() => import('./pages/MisOutfits'))
const ModelExamples = lazy(() => import('./pages/ModelExamples'))
const Mirror = lazy(() => import('./pages/Mirror'))

function App() {
  const { isAuthenticated, logout, loginWithRedirect, getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated) {
      delete axios.defaults.headers.common['Authorization']
      return
    }
    let cancelled = false
    getAccessTokenSilently()
      .then((token) => {
        if (!cancelled) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      })
      .catch(() => {
        if (!cancelled) delete axios.defaults.headers.common['Authorization']
      })
    return () => { cancelled = true }
  }, [isAuthenticated, getAccessTokenSilently])

  return (
<Router future={routerFuture}>
        <AuthTokenSetup />
        <div
          className="min-h-screen app-shell"
          style={{ background: 'var(--sw-white, #F5F4F0)' }}
        >
        <TubelightNavbar
          isAuthenticated={isAuthenticated}
          onLogin={() => loginWithRedirect({ authorizationParams: { redirect_uri: getRedirectOrigin() } })}
          onLogout={() => logout({ logoutParams: { returnTo: getRedirectOrigin() } })}
        />
        <div className="pb-24 sm:pb-0 sm:pt-20">
          <Suspense
            fallback={
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="sw-card rounded-2xl border border-[#D0CEC8] p-10 text-center">
                  <p className="sw-label text-[#888]">LOADING…</p>
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/prendas" element={<MisPrendas />} />
              <Route path="/outfits" element={<MisOutfits />} />
              <Route path="/modelo/ejemplos" element={<ModelExamples />} />
              <Route path="/mirror" element={<Mirror />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  )
}

export default App

