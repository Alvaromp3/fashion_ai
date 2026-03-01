import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'

const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim() || ''
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim() || ''
const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim() || undefined

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;text-align:center;color:#333;">#root not found</div>'
} else {
  try {
    const fallback = (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#333', background: '#f5f5f5', minHeight: '100vh' }}>
        <h1>Error loading the app</h1>
        <p>Open the browser console (F12) for details.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>Reload</button>
      </div>
    )
    const root = ReactDOM.createRoot(rootEl)
    if (!domain || !clientId) {
      root.render(
        <div style={{ padding: '2rem', textAlign: 'center', background: '#1e293b', color: '#e2e8f0', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Auth0 not configured</h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Create <code>frontend/.env</code> with VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID and VITE_AUTH0_AUDIENCE.</p>
        </div>
      )
    } else {
      root.render(
        <React.StrictMode>
          <ErrorBoundary fallback={fallback}>
            <Auth0Provider
              domain={domain}
              clientId={clientId}
              cacheLocation="localstorage"
              authorizationParams={{
                redirect_uri: window.location.origin,
                audience: audience
              }}
            >
              <App />
            </Auth0Provider>
          </ErrorBoundary>
        </React.StrictMode>
      )
    }
  } catch (err) {
    rootEl.innerHTML = `<div style="padding:2rem;text-align:center;background:#fee2e2;color:#991b1b;min-height:100vh;"><h1>Error</h1><p>${err?.message || 'Unknown'}</p><button onclick="location.reload()" style="padding:0.5rem 1rem;cursor:pointer;">Reload</button></div>`
  }
}

