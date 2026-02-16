import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error?.message || error, info?.componentStack)
    console.error('Full error:', error)
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#333', background: '#f5f5f5', minHeight: '100vh' }}>
          <h1>Error loading the app</h1>
          <p style={{ color: '#991b1b' }}>{this.state.error?.message || 'Unknown error'}</p>
          <p>Open the browser console (F12) for details.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      )
      return fallback
    }
    return this.props.children
  }
}
