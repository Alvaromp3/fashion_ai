const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const ML_SERVICE_DIR = (() => {
  const fromRoutes = path.resolve(__dirname, '../../ml-service');
  if (fs.existsSync(fromRoutes)) return fromRoutes;
  const fromCwd = path.resolve(process.cwd(), 'ml-service');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(__dirname, '../../ml-service');
})();

/** When ML is on a separate host (e.g. Render), proxy GET to ML service. */
async function proxyToMl(subPath, res) {
  const base = ML_SERVICE_URL.replace(/\/$/, '');
  if (!base) return false;
  try {
    const { data, status, headers } = await axios.get(`${base}${subPath}`, {
      responseType: subPath.endsWith('.png') ? 'arraybuffer' : 'json',
      timeout: 15000,
      validateStatus: () => true
    });
    if (status === 404) {
      res.status(404).json({ error: 'Not found' });
      return true;
    }
    if (subPath.endsWith('.png')) {
      res.set('Content-Type', 'image/png').send(Buffer.from(data));
    } else {
      res.json(data);
    }
    return true;
  } catch (err) {
    res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    return true;
  }
}

function sendFileOr404(fileName, res, errorLabel) {
  const filePath = path.join(ML_SERVICE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: errorLabel || 'Not found' });
  }
}

function sendJsonOr404(fileName, res, errorLabel) {
  const filePath = path.join(ML_SERVICE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Error reading file' });
    }
  } else {
    res.status(404).json({ error: errorLabel || 'Not found' });
  }
}

router.get('/data-audit', async (req, res) => {
  if (await proxyToMl('/data-audit', res)) return;
  sendFileOr404('data_audit.png', res, 'Data audit not found');
});

router.get('/confusion-matrix', async (req, res) => {
  if (await proxyToMl('/confusion-matrix', res)) return;
  sendFileOr404('confusion_matrix.png', res, 'Confusion matrix not found');
});

router.get('/metrics', async (req, res) => {
  if (await proxyToMl('/metrics', res)) return;
  sendJsonOr404('model_metrics.json', res, 'Metrics not found');
});

router.get('/confusion-matrix-vit', async (req, res) => {
  if (await proxyToMl('/confusion-matrix-vit', res)) return;
  sendFileOr404('confusion_matrix_vit.png', res, 'ViT confusion matrix not found');
});

router.get('/training-curves-vit', async (req, res) => {
  if (await proxyToMl('/training-curves-vit', res)) return;
  sendFileOr404('training_curves_vit.png', res, 'ViT training curves not found');
});

router.get('/metrics-vit', async (req, res) => {
  if (await proxyToMl('/metrics-vit', res)) return;
  sendJsonOr404('model_metrics_vit.json', res, 'ViT metrics not found');
});

module.exports = router;
