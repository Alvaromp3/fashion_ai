'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { app, checkMlServiceReachability } = require('./app');
const openrouter = require('./config/openrouter');
const { isAuthEnabled } = require('./middleware/auth');
const { sanitizeLog } = require('./utils/sanitizeLog');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_ai', {
    serverSelectionTimeoutMS: 8000
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${PORT} (PORT env: ${sanitizeLog(process.env.PORT ?? 'unset', 32)})`);
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

  (async () => {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:6001';
    console.log(`Checking AI/ML server reachability at ${sanitizeLog(mlUrl, 500)}...`);
    const result = await checkMlServiceReachability();
    if (result.ok) {
      console.log('AI/ML server: reachable', result.data?.model_loaded ? '(model loaded)' : '');
    } else {
      console.warn(
        `AI/ML server: not reachable — ${sanitizeLog(result.message)}. Endpoints that need ML (e.g. /api/classify) may fail until the service is running.`
      );
    }
  })();
});

server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
});
