const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const openrouter = require('./config/openrouter');
const { requireAuth, isAuthEnabled } = require('./middleware/auth');
const app = express();
app.locals.openrouter = openrouter;

app.use(cors());
// Mirror puede enviar frames (base64) para evaluación visual.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/model/images', express.static(path.join(__dirname, '../ml-service')));

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
        return { ok: true, data: { status: 'OK', model_loaded: true, woke_from_root: true } };
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
    : 'Run in a terminal: ./ml-service/run_ml.sh (or ./start-all.sh)';
  res.status(503).json({
    available: false,
    error: 'ML service not running',
    hint,
    hosted: result.isHostedMl
  });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (openrouter.isConfigured) {
    console.log('OpenRouter: configurado (apiKey cargada desde .env)');
  } else {
    console.warn('OpenRouter: OPENROUTER_API_KEY no definida en .env');
  }
  if (isAuthEnabled) {
    console.log('Auth0: login required for /api/prendas and /api/outfits (per-user wardrobe)');
  } else {
    console.log('Auth0: not configured — using anonymous user; set AUTH0_DOMAIN and AUTH0_AUDIENCE for login');
  }
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary: configured — uploads will go to cloud');
  } else {
    console.log('Cloudinary: not set — uploads saved to backend/uploads/');
  }
  const mongoose = require('mongoose');
  global.__mongoose = mongoose;
  app.use('/api/prendas', requireAuth, require('./routes/prendas'));
  app.use('/api/outfits', requireAuth, require('./routes/outfits'));
  app.use('/api/classify', require('./routes/classify'));
  app.use('/api/model', require('./routes/model'));
  app.use('/api/mirror', require('./routes/mirror'));
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_ai', {
    serverSelectionTimeoutMS: 8000
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

  // Startup test: verify backend can reach the AI/ML server
  (async () => {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:6001';
    console.log(`Checking AI/ML server reachability at ${mlUrl}...`);
    const result = await checkMlServiceReachability();
    if (result.ok) {
      console.log('AI/ML server: reachable', result.data?.model_loaded ? '(model loaded)' : '');
    } else {
      console.warn(`AI/ML server: not reachable — ${result.message}. Endpoints that need ML (e.g. /api/classify) may fail until the service is running.`);
    }
  })();
});

server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
});
