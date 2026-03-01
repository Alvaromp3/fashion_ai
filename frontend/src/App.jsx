import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { TubelightNavbar } from './components/ui/tubelight-navbar'
import Dashboard from './pages/Dashboard'
import MisPrendas from './pages/MisPrendas'
import MisOutfits from './pages/MisOutfits'
import ConfusionMatrix from './pages/ConfusionMatrix'
import ModelExamples from './pages/ModelExamples'
import Mirror from './pages/Mirror'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }

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
      <div
        className="min-h-screen app-shell"
        style={{ background: 'var(--content-bg)' }}
      >
        <TubelightNavbar
          isAuthenticated={isAuthenticated}
          onLogin={() => loginWithRedirect({ authorizationParams: { redirect_uri: window.location.origin } })}
          onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        />
        <div className="pb-24 sm:pb-0 sm:pt-20">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prendas" element={<MisPrendas />} />
            <Route path="/outfits" element={<MisOutfits />} />
            <Route path="/modelo/confusion-matrix" element={<ConfusionMatrix />} />
            <Route path="/modelo/ejemplos" element={<ModelExamples />} />
            <Route path="/mirror" element={<Mirror />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

