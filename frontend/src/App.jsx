import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { TubelightNavbar } from './components/ui/tubelight-navbar'
import { AuthTokenSetup } from './components/AuthTokenSetup'
import { getRedirectOrigin } from './utils/auth0Redirect'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Wardrobe = lazy(() => import('./pages/Wardrobe'))
const WardrobeOutfits = lazy(() => import('./pages/WardrobeOutfits'))
const PrendaDetail = lazy(() => import('./pages/PrendaDetail'))
const OutfitDetail = lazy(() => import('./pages/OutfitDetail'))
const MisOutfits = lazy(() => import('./pages/MisOutfits'))
const GenerateOutfitDetail = lazy(() => import('./pages/GenerateOutfitDetail'))
const ModelExamples = lazy(() => import('./pages/ModelExamples'))
const Mirror = lazy(() => import('./pages/Mirror'))
const MirrorContext = lazy(() => import('./pages/MirrorContext'))
const WardrobeChat = lazy(() => import('./pages/WardrobeChat'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0()

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
          className="min-h-dvh overflow-x-hidden app-shell"
          style={{ background: 'var(--sw-white, #F5F4F0)' }}
        >
        <TubelightNavbar
          isAuthenticated={isAuthenticated}
          onLogin={() => loginWithRedirect({ authorizationParams: { redirect_uri: getRedirectOrigin() } })}
        />
        <div className="pb-[max(5.75rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))]">
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
              <Route path="/wardrobe" element={<Wardrobe />} />
              <Route path="/wardrobe/outfits" element={<WardrobeOutfits />} />
              <Route path="/wardrobe/prenda/:id" element={<PrendaDetail />} />
              <Route path="/wardrobe/outfit/:id" element={<OutfitDetail />} />
              <Route path="/prendas" element={<Navigate to="/wardrobe" replace />} />
              <Route path="/generate" element={<MisOutfits />} />
              <Route path="/generate/outfit" element={<GenerateOutfitDetail />} />
              <Route path="/outfits" element={<Navigate to="/generate" replace />} />
              <Route path="/modelo/ejemplos" element={<ModelExamples />} />
              <Route path="/mirror" element={<Mirror />} />
              <Route path="/mirror/context" element={<MirrorContext />} />
              <Route path="/chat" element={<WardrobeChat />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  )
}

export default App

