'use strict';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Single source of truth: backend/.env (no usar .env.example para cargar variables)
dotenv.config({ path: path.join(__dirname, '.env') });

const helmet = require('helmet');
const openrouter = require('./config/openrouter');
const { requireAuth } = require('./middleware/auth');
const {
  apiLimiter,
  classifyLimiter,
  uploadLimiterConditional,
} = require('./middleware/freeTierLimits');
const app = express();
app.locals.openrouter = openrouter;
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS: si CORS_ORIGINS está definido, permitir solo esos orígenes; si no, permitir todos (dev)
const corsOrigins = process.env.CORS_ORIGINS;
if (corsOrigins && corsOrigins.trim()) {
  const origins = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins, credentials: true }));
} else {
  app.use(cors());
}
// Mirror puede enviar frames (base64) para evaluación visual.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/model/images', express.static(path.join(__dirname, '../ml-service')));
app.use('/api', apiLimiter);
app.use('/api/classify', classifyLimiter);
app.use('/api/prendas', uploadLimiterConditional);

app.get('/api/health', (req, res) => {
  const mongoose = global.__mongoose;
  const mongodb = mongoose && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: mongodb === 'connected' ? 'OK' : 'DEGRADED',
    message: 'Fashion AI Backend is running',
    mongodb
  });
});

/** Check if the ML/AI service is reachable. Used by /api/ml-health and startup test. */
async function checkMlServiceReachability() {
  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:6001';
  const isHostedMl = /\.hf\.space|\.onrender\.com|https?:\/\/(?!localhost|127\.)/.test(mlUrl || '');
  const timeoutMs = isHostedMl ? 20000 : 3000;
  try {
    try {
      const healthRes = await axios.get(`${mlUrl}/health`, { timeout: timeoutMs });
      return { ok: true, data: healthRes.data };
    } catch (healthErr) {
      if (!isHostedMl) throw healthErr;
      const rootRes = await axios.get(mlUrl.replace(/\/$/, ''), { timeout: timeoutMs });
      const root = rootRes.data;
      if (root && (root.health === '/health' || root.message === 'Fashion AI ML API')) {
        return {
          ok: true,
          data: { status: 'OK', model_loaded: true, vit_model_loaded: true, woke_from_root: true }
        };
      }
      throw healthErr;
    }
  } catch (err) {
    return {
      ok: false,
      mlUrl,
      isHostedMl,
      message: err.code === 'ECONNREFUSED' ? 'Connection refused' : err.message || 'Unknown error'
    };
  }
}

app.get('/api/ml-health', async (req, res) => {
  const result = await checkMlServiceReachability();
  if (result.ok) {
    return res.json({ available: true, ...result.data });
  }
  const hint = result.isHostedMl
    ? `ML is hosted (e.g. Hugging Face Space). The Space may be sleeping—open ${result.mlUrl} in a browser to wake it, or check ML_SERVICE_URL on the backend.`
    : 'Run in a terminal: ./ml-service/run_ml.sh (or start ML with ./start-all.sh)';
  res.status(503).json({
    available: false,
    error: 'ML service not running',
    hint,
    hosted: result.isHostedMl
  });
});

const mongoose = require('mongoose');
global.__mongoose = mongoose;

app.use('/api/prendas', requireAuth, require('./routes/prendas'));
app.use('/api/outfits', requireAuth, require('./routes/outfits'));
app.use(
  '/api/me',
  requireAuth,
  (req, res, next) => {
    const sub = req.auth?.payload?.sub || 'anonymous';
    req.user = { sub };
    next();
  },
  require('./routes/me')
);
app.use('/api/chat', requireAuth, require('./routes/chat'));
app.use('/api/classify', require('./routes/classify'));
app.use('/api/model', require('./routes/model'));
app.use('/api/mirror', require('./routes/mirror'));

module.exports = { app, checkMlServiceReachability };
