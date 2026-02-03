const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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

async function processAndClassify(req, res, endpoint) {
  let convertedFilePath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    let filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isHeic = ['.heic', '.heif'].includes(fileExt) || 
                   ['image/heic', 'image/heif', 'image/x-heic', 'image/x-heif'].includes(req.file.mimetype);

    if (isHeic) {
      try {
        convertedFilePath = path.join(path.dirname(filePath), `converted-${Date.now()}.jpg`);
        await sharp(filePath).jpeg({ quality: 90 }).toFile(convertedFilePath);
        filePath = convertedFilePath;
      } catch (e) {
        console.error('Error converting HEIC:', e);
      }
    }

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('imagen', fs.createReadStream(filePath), { filename: path.basename(filePath), contentType: 'image/jpeg' });

    try {
      const response = await axios.post(`${mlServiceUrl}${endpoint}`, formData, {
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
        model: response.data.model || 'cnn',
        model_file: response.data.model_file || (response.data.model === 'vision_transformer' ? 'vision_transformer_moda_modelo.keras' : 'modelo_ropa.h5')
      });
    } catch (mlError) {
      [req.file.path, convertedFilePath].forEach(p => p && fs.existsSync(p) && fs.unlinkSync(p));
      const status = mlError.response?.status;
      const data = mlError.response?.data;

      if (endpoint === '/classify-vit') {
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

router.post('/', upload.single('imagen'), (req, res) => processAndClassify(req, res, '/classify'));
router.post('/vit', upload.single('imagen'), (req, res) => processAndClassify(req, res, '/classify-vit'));

module.exports = router;
