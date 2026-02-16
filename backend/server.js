const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/model/images', express.static(path.join(__dirname, '../ml-service')));

// Load routes
app.use('/api/prendas', require('./routes/prendas'));
app.use('/api/outfits', require('./routes/outfits'));
app.use('/api/classify', require('./routes/classify'));
app.use('/api/model', require('./routes/model'));

app.get('/api/health', (req, res) => {
  const mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: mongodb === 'connected' ? 'OK' : 'DEGRADED',
    message: 'Fashion AI Backend is running',
    mongodb
  });
});

app.get('/api/ml-health', async (req, res) => {
  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
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

const PORT = process.env.PORT || 5002;

console.log(`[DEBUG] About to start server on port ${PORT}...`);

// Start server immediately, don't wait for MongoDB
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error(`[ERROR] Server error:`, err);
});

console.log(`[DEBUG] Server listen() called`);

// Connect to MongoDB (non-blocking)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_ai', {
  serverSelectionTimeoutMS: 8000
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

