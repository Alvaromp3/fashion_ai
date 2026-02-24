import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['framer-motion', 'react-icons/fa'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'self'; base-uri 'self';"
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild'
  },
  esbuild: {
    legalComments: 'none'
  }
})

