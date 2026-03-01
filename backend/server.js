const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const openrouter = require('./config/openrouter');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { apiLimiter, classifyLimiter, uploadLimiterConditional } = require('./middleware/freeTierLimits');
const app = express();
app.locals.openrouter = openrouter;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : {}));
// Mirror puede enviar frames (base64) para evaluación visual.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/model/images', express.static(path.join(__dirname, '../ml-service')));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  const mongoose = global.__mongoose;
  const mongodb = mongoose && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: mongodb === 'connected' ? 'OK' : 'DEGRADED',
    message: 'Fashion AI Backend is running',
    mongodb
  });
});

app.get('/api/ml-health', async (req, res) => {
  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:6001';
  try {
    const { data } = await axios.get(`${mlUrl}/health`, { timeout: 3000 });
    res.json({ available: true, ...data });
  } catch (err) {
    res.status(503).json({
      available: false,
      error: 'ML service not running',
      hint: 'Run in a terminal: ./ml-service/run_ml.sh (or ./start-all.sh)'
    });
  }
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (openrouter.isConfigured) {
    console.log('OpenRouter: configurado (apiKey cargada desde .env)');
  } else {
    console.warn('OpenRouter: OPENROUTER_API_KEY no definida en .env');
  }
  const mongoose = require('mongoose');
  global.__mongoose = mongoose;
  app.use('/api/prendas', requireAuth, uploadLimiterConditional, require('./routes/prendas'));
  app.use('/api/outfits', requireAuth, require('./routes/outfits'));
  app.use('/api/classify', requireAuth, classifyLimiter, require('./routes/classify'));
  app.use('/api/model', requireAuth, requireAdmin, require('./routes/model'));
  app.use('/api/mirror', requireAuth, require('./routes/mirror'));
  app.use('/api/me', requireAuth, require('./routes/me'));
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_ai', {
    serverSelectionTimeoutMS: 8000
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));
});

server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
});
