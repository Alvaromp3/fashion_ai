const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const { buildMlClassifyUrl } = require('../utils/safeOutboundUrl');
const { validateMirrorImageUrl } = require('../utils/safeMirrorImageUrl');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'classify-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|bmp|tiff|tif/;
    const valid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  ['image/heic', 'image/heif', 'image/x-heic', 'image/x-heif'].includes(file.mimetype);
    cb(valid ? null : new Error('Image format not supported'), valid);
  }
});

/**
 * Run classification via ML service; handles HEIC conversion and cleanup.
 * @param {import('express').Request} req - Must have req.file (multer)
 * @param {import('express').Response} res
 * @param {string} endpoint - e.g. '/classify' or '/classify-vit'
 */
async function processAndClassify(req, res, endpoint) {
  let convertedFilePath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    // Use separate ViT Space when set (ViT called rarely; keeps main Space lighter)
    const isVit = endpoint.startsWith('/classify-vit');
    const mlServiceUrl = isVit && process.env.ML_VIT_SERVICE_URL
      ? process.env.ML_VIT_SERVICE_URL
      : (process.env.ML_SERVICE_URL || 'http://localhost:6001');
    let filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isHeic = ['.heic', '.heif'].includes(fileExt) || 
                   ['image/heic', 'image/heif', 'image/x-heic', 'image/x-heif'].includes(req.file.mimetype);

    if (isHeic) {
      try {
        const inputBuffer = fs.readFileSync(filePath);
        const outputBuffer = await heicConvert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.9
        });
        convertedFilePath = path.join(path.dirname(filePath), `converted-${Date.now()}.jpg`);
        fs.writeFileSync(convertedFilePath, outputBuffer);
        filePath = convertedFilePath;
      } catch (e) {
        console.error('Error converting HEIC with heic-convert:', e);
        // Si no podemos convertir HEIC/HEIF a JPEG, intentamos enviar el archivo original;
        // si el ML falla, devolverá su propio mensaje de error.
        convertedFilePath = null;
      }
    }

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('imagen', fs.createReadStream(filePath), { filename: path.basename(filePath), contentType: 'image/jpeg' });

    try {
      let requestUrl;
      try {
        requestUrl = buildMlClassifyUrl(mlServiceUrl, endpoint);
      } catch (e) {
        [req.file.path, convertedFilePath].forEach((p) => p && fs.existsSync(p) && fs.unlinkSync(p));
        return res.status(500).json({ error: e.message || 'Invalid ML service configuration' });
      }
      const response = await axios.post(requestUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      [req.file.path, convertedFilePath].forEach(p => p && fs.existsSync(p) && fs.unlinkSync(p));

      res.json({
        tipo: response.data.tipo || 'desconocido',
        color: response.data.color || 'desconocido',
        confianza: response.data.confianza || 0.5,
        clase: response.data.clase || 0,
        clase_nombre: response.data.clase_nombre || 'desconocido',
        top3: response.data.top3 || [],
        model: response.data.model || 'vision_transformer',
        model_file: response.data.model_file || (response.data.model === 'vision_transformer' ? 'best_model_17_marzo.keras' : 'best_model_17_marzo.keras'),
        yolo_detection: response.data.yolo_detection || null,
        pipeline_steps: response.data.pipeline_steps || []
      });
    } catch (mlError) {
      [req.file.path, convertedFilePath].forEach(p => p && fs.existsSync(p) && fs.unlinkSync(p));
      const status = mlError.response?.status;
      const data = mlError.response?.data;

      if (isVit) {
        return res.status(503).json({ error: data?.error || 'Vision Transformer model not available', model_loaded: false });
      }
      if (status === 503 && data?.loading) {
        return res.status(503).json({ error: 'Models still loading. Wait ~1 min and try again.', loading: true });
      }
      res.status(503).json({
        error: data?.error || 'ML service not available',
        tipo: 'superior', color: 'desconocido', confianza: 0.5, clase: 0,
        clase_nombre: 'desconocido', warning: 'ML service not available'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error classifying the image' });
  }
}

// Ya no usamos CNN: mantenemos compatibilidad pero enrutamos '/' a ViT.
router.post('/', upload.single('imagen'), (req, res) => processAndClassify(req, res, '/classify-vit'));
router.post('/vit', upload.single('imagen'), (req, res) => processAndClassify(req, res, '/classify-vit'));
// Ya no usamos el modelo "vit-real" en el producto.
// router.post('/vit-real', upload.single('imagen'), (req, res) => processAndClassify(req, res, '/classify-vit-real'));

/** POST /api/classify/vit-base64 — Mirror: classify from data URL (no multipart) */
router.post('/vit-base64', async (req, res) => {
  const imageDataUrl = req.body?.imageDataUrl ?? req.body?.image_data_url ?? '';
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return res.status(400).json({ error: 'imageDataUrl (data:image/...) required' });
  }
  const urlCheck = validateMirrorImageUrl(imageDataUrl);
  if (!urlCheck.ok) {
    return res.status(400).json({ error: urlCheck.reason });
  }
  if (!imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'imageDataUrl must be a data:image URL' });
  }
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, 'mirror-vit-' + Date.now() + '.jpg');
  try {
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    await sharp(buf).jpeg({ quality: 90 }).toFile(tempPath);
    req.file = { path: tempPath, originalname: 'frame.jpg', mimetype: 'image/jpeg' };
    await processAndClassify(req, res, '/classify-vit');
  } catch (e) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: e.message || 'Error processing image' });
  } finally {
    if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (_) {}
  }
});

module.exports = router;
