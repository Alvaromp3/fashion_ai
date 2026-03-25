/**
 * Sirve el build del frontend (dist) en el puerto 3000 y hace proxy de /api y /uploads al backend.
 * Uso: npm run build && node serve.cjs
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { resolveUnder, existsUnder } = require('../scripts/lib/resolve-under.cjs');

const PORT = 3000;
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const DIST = resolveUnder(__dirname, 'dist');
const INDEX_HTML = resolveUnder(DIST, 'index.html');

if (!existsUnder(__dirname, 'dist')) {
  console.error('Carpeta dist no existe. Ejecuta: npm run build');
  process.exit(1);
}

const app = express();

app.use('/api', createProxyMiddleware({ target: BACKEND, changeOrigin: true }));
app.use('/uploads', createProxyMiddleware({ target: BACKEND, changeOrigin: true }));

app.use(express.static(DIST));
app.get('*', (req, res) => {
  res.sendFile(INDEX_HTML);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend: http://localhost:${PORT} (proxy /api -> ${BACKEND})`);
});
