/**
 * Sirve el build del frontend (dist) en el puerto 3000 y hace proxy de /api y /uploads al backend.
 * Uso: npm run build && node serve.cjs
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5002';
const DIST = path.join(__dirname, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('Carpeta dist no existe. Ejecuta: npm run build');
  process.exit(1);
}

const app = express();

app.use('/api', createProxyMiddleware({ target: BACKEND, changeOrigin: true }));
app.use('/uploads', createProxyMiddleware({ target: BACKEND, changeOrigin: true }));

app.use(express.static(DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend: http://localhost:${PORT} (proxy /api -> ${BACKEND})`);
});
