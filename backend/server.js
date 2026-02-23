const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  const mongoose = require('mongoose');
  global.__mongoose = mongoose;
  app.use('/api/prendas', require('./routes/prendas'));
  app.use('/api/outfits', require('./routes/outfits'));
  app.use('/api/classify', require('./routes/classify'));
  app.use('/api/model', require('./routes/model'));
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_ai', {
    serverSelectionTimeoutMS: 8000
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));
});

server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
});
