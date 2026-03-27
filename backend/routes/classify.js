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

const vitClassToTipo = (className) => {
  if (!className) return 'desconocido';
  const s = String(className).toLowerCase().trim().replace(/_/g, '-');
  const map = {
    't-shirt': 'superior',
    tshirt: 'superior',
    top: 'superior',
    trouser: 'inferior',
    pants: 'inferior',
    pullover: 'superior',
    dress: 'vestido',
    coat: 'abrigo',
    sandal: 'zapatos',
    sneaker: 'zapatos',
    boot: 'zapatos',
    shoe: 'zapatos',
    'ankle-boot': 'zapatos',
    bag: 'bolso',
    shirt: 'superior',
  };
  return map[s] || 'desconocido';
};

const isUnknown = (v) => v == null || String(v).trim() === '' || String(v).toLowerCase().trim() === 'desconocido';

async function detectColorFromFile(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .rotate()
      .resize(96, 96, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels || 3;
    if (!data || channels < 3) return 'desconocido';

    // Heuristic: ignore near-white pixels (background).
    let rSum = 0, gSum = 0, bSum = 0, n = 0;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 245 && (max - min) < 12) continue;
      rSum += r; gSum += g; bSum += b; n++;
    }
    if (n < 50) return 'desconocido';

    const r = rSum / n, g = gSum / n, b = bSum / n;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const v = max / 255;
    const sat = max === 0 ? 0 : (delta / max);

    if (sat < 0.18) {
      if (v < 0.18) return 'negro';
      if (v > 0.88) return 'blanco';
      return 'gris';
    }

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    if (v < 0.22) return 'negro';
    if (v > 0.92 && sat < 0.35) return 'blanco';
    if (h < 15 || h >= 345) return 'rojo';
    if (h < 45) return 'naranja';
    if (h < 70) return 'amarillo';
    if (h < 165) return 'verde';
    if (h < 255) return 'azul';
    if (h < 290) return 'magenta';
    if (h < 345) return 'rosa';
    return 'desconocido';
  } catch (e) {
    console.warn('[classify] detectColorFromFile failed:', e?.message || e);
    return 'desconocido';
  }
}

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

      const raw = response.data || {};
      const top3 = Array.isArray(raw.top3) ? raw.top3 : [];
      const top1 = (top3[0] && typeof top3[0] === 'object') ? top3[0] : null;

      const top1ClassName = top1?.clase_nombre ?? top1?.class_name ?? null;
      const top1Confidence =
        (typeof top1?.confianza === 'number')
          ? top1.confianza
          : (typeof top1?.confidence === 'number' ? top1.confidence : null);

      const looksLikePlaceholderConfidence =
        typeof raw.confianza !== 'number'
        || raw.confianza <= 0
        || raw.confianza > 1
        || (raw.confianza === 0.5 && isUnknown(raw.clase_nombre));

      const inferredTipo = vitClassToTipo(top1ClassName);
      const inferredColor = isUnknown(raw.color) ? await detectColorFromFile(filePath) : raw.color;

      res.json({
        tipo: isUnknown(raw.tipo) ? inferredTipo : raw.tipo,
        color: isUnknown(raw.color) ? inferredColor : raw.color,
        confianza: looksLikePlaceholderConfidence && typeof top1Confidence === 'number' ? top1Confidence : (raw.confianza ?? 0.5),
        clase: (typeof raw.clase === 'number' && raw.clase !== 0) ? raw.clase : (top1?.clase ?? top1?.class_index ?? 0),
        clase_nombre: isUnknown(raw.clase_nombre) ? (top1ClassName || 'desconocido') : raw.clase_nombre,
        top3,
        model: raw.model || 'vision_transformer',
        model_file: raw.model_file || 'best_model_17_marzo.keras',
        yolo_detection: raw.yolo_detection || null,
        pipeline_steps: raw.pipeline_steps || []
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
