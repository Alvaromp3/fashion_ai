const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const ML_SERVICE_DIR = (() => {
  const fromRoutes = path.resolve(__dirname, '../../ml-service');
  if (fs.existsSync(fromRoutes)) return fromRoutes;
  const fromCwd = path.resolve(process.cwd(), 'ml-service');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(__dirname, '../../ml-service');
})();

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

router.get('/data-audit', (req, res) => {
  sendFileOr404('data_audit.png', res, 'Data audit not found');
});

router.get('/confusion-matrix', (req, res) => {
  sendFileOr404('confusion_matrix.png', res, 'Confusion matrix not found');
});

router.get('/metrics', (req, res) => {
  sendJsonOr404('model_metrics.json', res, 'Metrics not found');
});

router.get('/confusion-matrix-vit', (req, res) => {
  sendFileOr404('confusion_matrix_vit.png', res, 'ViT confusion matrix not found');
});

router.get('/training-curves-vit', (req, res) => {
  sendFileOr404('training_curves_vit.png', res, 'ViT training curves not found');
});

router.get('/metrics-vit', (req, res) => {
  sendJsonOr404('model_metrics_vit.json', res, 'ViT metrics not found');
});

module.exports = router;
