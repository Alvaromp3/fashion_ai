const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { resolveUnder } = require('../utils/safePath');
const { buildMlProxyGetUrl } = require('../utils/safeOutboundUrl');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';

const ALLOWED_ML_ARTIFACT_RELPATH = new Set([
  'data_audit.png',
  'confusion_matrix.png',
  'model_metrics.json',
  'confusion_matrix_vit.png',
  'vit_real_pictures/confusion_matrix_vit_real_picture.png',
  'training_curves_vit.png',
  'model_metrics_vit.json'
]);
const ML_SERVICE_DIR = (() => {
  const fromRoutes = path.resolve(__dirname, '../../ml-service');
  if (fs.existsSync(fromRoutes)) return fromRoutes;
  const fromCwd = path.resolve(process.cwd(), 'ml-service');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(__dirname, '../../ml-service');
})();

/** When ML is on a separate host (e.g. Render), proxy GET to ML service. */
const IMAGE_SUBPATHS = ['/confusion-matrix', '/confusion-matrix-vit', '/confusion-matrix-vit-real', '/data-audit', '/training-curves-vit'];
function isImageProxy(subPath) {
  return subPath.endsWith('.png') || IMAGE_SUBPATHS.some(p => subPath === p || subPath.startsWith(p + '?'));
}

async function proxyToMl(subPath, res) {
  if (!ML_SERVICE_URL.trim()) return false;
  let requestUrl;
  try {
    requestUrl = buildMlProxyGetUrl(ML_SERVICE_URL, subPath);
  } catch {
    res.status(400).json({ error: 'Invalid proxy path' });
    return true;
  }
  try {
    const { data, status, headers } = await axios.get(requestUrl, {
      responseType: isImageProxy(subPath) ? 'arraybuffer' : 'json',
      timeout: 15000,
      validateStatus: () => true
    });
    if (status === 404) {
      res.status(404).json({ error: 'Not found' });
      return true;
    }
    if (isImageProxy(subPath)) {
      res.set('Content-Type', headers?.['content-type'] || 'image/png').send(Buffer.from(data));
    } else {
      res.json(data);
    }
    return true;
  } catch (err) {
    res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    return true;
  }
}

function resolveMlArtifactPath(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (!ALLOWED_ML_ARTIFACT_RELPATH.has(norm)) {
    return null;
  }
  const segments = norm.split('/').filter(Boolean);
  return resolveUnder(ML_SERVICE_DIR, ...segments);
}

function sendFileOr404(relPath, res, errorLabel) {
  const filePath = resolveMlArtifactPath(relPath);
  if (filePath && fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: errorLabel || 'Not found' });
  }
}

function sendJsonOr404(relPath, res, errorLabel) {
  const filePath = resolveMlArtifactPath(relPath);
  if (filePath && fs.existsSync(filePath)) {
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

router.get('/confusion-matrix-vit-real', async (req, res) => {
  if (await proxyToMl('/confusion-matrix-vit-real', res)) return;
  sendFileOr404(
    'vit_real_pictures/confusion_matrix_vit_real_picture.png',
    res,
    'ViT (real pictures) confusion matrix not found'
  );
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
