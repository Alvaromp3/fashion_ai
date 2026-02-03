import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;text-align:center;color:#333;">#root element not found</div>'
} else {
  const fallback = (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#333', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1>Error loading the app</h1>
      <p>Open the browser console (F12) for details.</p>
    </div>
  )
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary fallback={fallback}>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

