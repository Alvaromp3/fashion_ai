import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'

console.log('[main.jsx] Starting app initialization...')

const rootEl = document.getElementById('root')
if (!rootEl) {
  console.error('[main.jsx] Root element not found!')
  document.body.innerHTML = '<div style="padding:2rem;text-align:center;color:#333;">#root element not found</div>'
} else {
  console.log('[main.jsx] Root element found, creating React root...')
  try {
    const fallback = (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#333', background: '#f5f5f5', minHeight: '100vh' }}>
        <h1>Error loading the app</h1>
        <p>Open the browser console (F12) for details.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    )
    console.log('[main.jsx] Creating React root...')
    const root = ReactDOM.createRoot(rootEl)
    console.log('[main.jsx] Rendering app...')
    root.render(
      <React.StrictMode>
        <ErrorBoundary fallback={fallback}>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )
    console.log('[main.jsx] React app mounted successfully!')
  } catch (error) {
    console.error('[main.jsx] Fatal error mounting React app:', error)
    console.error('[main.jsx] Error stack:', error.stack)
    rootEl.innerHTML = `
      <div style="padding:2rem;text-align:center;background:#fee2e2;color:#991b1b;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;font-family:system-ui,sans-serif;">
        <h1 style="margin:0;">Error al cargar la aplicación</h1>
        <p style="margin:0;font-size:0.9rem;">${error?.message || 'Error desconocido'}</p>
        <p style="margin:0;font-size:0.85rem;">Abre la consola del navegador (F12) para más detalles.</p>
        <button onclick="window.location.reload()" style="padding:0.5rem 1rem;margin-top:1rem;cursor:pointer;background:#0ea5e9;color:white;border:none;border-radius:4px;">Recargar página</button>
      </div>
    `
  }
}

