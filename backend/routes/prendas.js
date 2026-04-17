const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Prenda = require('../models/Prenda');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const { isConfigured: isR2Configured, uploadToR2, deleteFromR2 } = require('../utils/r2');
const { checkR2StorageLimit } = require('../utils/cloudflareUsage');
const { getImageStorageTarget } = require('../utils/storageTarget');
const { getUserId } = require('../middleware/auth');
const { resolveUploadsPublicPath } = require('../utils/safePath');
const { parseObjectId } = require('../utils/mongoSafe');
const { randomFileSuffix } = require('../utils/randomFileSuffix');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

/** Query filter by user: only their prendas, or legacy docs without userId when anonymous. */
function userFilter(userId) {
  if (userId === 'anonymous') {
    return { $or: [{ userId: 'anonymous' }, { userId: { $exists: false } }] };
  }
  return { userId };
}

/** Mismo path que para el script de entrenamiento (train_model): las fotos que se copian aquí
 * al guardar prendas con alta confianza son las que debe leer el entrenamiento. Ver ml-service/INSTALL.md. */
const DATASET_PATH = process.env.DATASET_PATH || '';
const MIN_CONFIDENCE_FOR_DATASET = 0.8;

const CLASS_TO_FOLDER = {
  Ankle_boot: 'Ankle_boot', Bag: 'Bag', Coat: 'Coat', Dress: 'Dress',
  Pullover: 'Pullover', Sandal: 'Sandal', Shirt: 'Shirt', Sneaker: 'Sneaker',
  'T-shirt': 'T-shirt', Trouser: 'Trouser'
};

function getPrendasMaxPerUser() {
  return Math.max(parseInt(process.env.PRENDAS_MAX_PER_USER, 10) || 200, 1);
}

function copyToDataset(imagePath, clase_nombre, confianza) {
  if (!DATASET_PATH || confianza < MIN_CONFIDENCE_FOR_DATASET) return false;
  if (!clase_nombre || !CLASS_TO_FOLDER[clase_nombre]) return false;
  try {
    const trainDir = path.join(DATASET_PATH, 'train_df', CLASS_TO_FOLDER[clase_nombre]);
    if (!fs.existsSync(path.dirname(trainDir))) return false;
    fs.mkdirSync(trainDir, { recursive: true });
    const ext = path.extname(imagePath) || '.jpg';
    const destPath = path.join(trainDir, `user_${Date.now()}_${randomFileSuffix()}${ext}`);
    fs.copyFileSync(imagePath, destPath);
    return true;
  } catch {
    return false;
  }
}

async function enforcePrendasCountLimit(res, userId) {
  const prendasMaxPerUser = getPrendasMaxPerUser();
  const currentCount = await Prenda.countDocuments(userFilter(userId));
  if (currentCount >= prendasMaxPerUser) {
    res.status(429).json({
      error: 'Wardrobe item limit reached for free tier.',
      limit: prendasMaxPerUser,
      currentCount
    });
    return false;
  }
  return true;
}

async function enforceR2SoftLimit(res, filePath) {
  if (getImageStorageTarget(process.env) !== 'r2') return true;
  const stat = fs.statSync(filePath);
  const check = await checkR2StorageLimit(stat.size);
  if (check.allowed) return true;
  res.status(429).json({
    error: 'R2 storage soft limit reached. Upload blocked to stay in free tier.',
    limitBytes: check.limitBytes,
    currentBytes: check.currentBytes
  });
  return false;
}

/** Per-user upload folder: uploads/{userId}/ so each user has their own images and DB matches. */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = getUserId(req);
    if (!userId) {
      return cb(new Error('User not identified'));
    }
    const uploadDir = path.join(__dirname, '../uploads', userId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomFileSuffix()}`;
    cb(null, 'prenda-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|bmp|tiff|tif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'image/heic' || 
                     file.mimetype === 'image/heif' ||
                     file.mimetype === 'image/x-heic' ||
                     file.mimetype === 'image/x-heif';
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Image format not supported. Use: jpeg, jpg, png, gif, webp, heic, heif, bmp, tiff'));
    }
  }
});

router.post('/upload', upload.single('imagen'), async (req, res) => {
  const userId = getUserId(req);
  let convertedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const canAddMorePrendas = await enforcePrendasCountLimit(res, userId);
    if (!canAddMorePrendas) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return;
    }

    let filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isHeic = fileExt === '.heic' || fileExt === '.heif' ||
      req.file.mimetype === 'image/heic' ||
      req.file.mimetype === 'image/heif' ||
      req.file.mimetype === 'image/x-heic' ||
      req.file.mimetype === 'image/x-heif';

    if (isHeic) {
      try {
        convertedFilePath = path.join(path.dirname(filePath), `converted-${Date.now()}.jpg`);
        await sharp(filePath)
          .jpeg({ quality: 90 })
          .toFile(convertedFilePath);
        filePath = convertedFilePath;
        req.file.filename = path.basename(convertedFilePath);
        console.log('HEIC image converted to JPEG');
      } catch (conversionError) {
        console.error('Error converting HEIC:', conversionError);
      }
    }

    const { tipo, color, confianza, clase_nombre } = req.body;
    let confianzaValue = confianza != null && confianza !== '' ? parseFloat(confianza) : 0.5;
    if (Number.isNaN(confianzaValue) || confianzaValue < 0) confianzaValue = 0;
    if (confianzaValue > 1) confianzaValue = 1;

    const tipoValidos = ['superior', 'inferior', 'zapatos', 'accesorio', 'abrigo', 'vestido'];
    const tipoFinal = tipo && tipoValidos.includes(String(tipo).toLowerCase()) ? String(tipo).toLowerCase() : 'superior';

    let ocasionArray = [];
    if (req.body.ocasion) {
      ocasionArray = Array.isArray(req.body.ocasion)
        ? req.body.ocasion
        : [req.body.ocasion];
    }
    const ocasionesValidas = ['casual', 'formal', 'deportivo', 'fiesta', 'trabajo'];
    ocasionArray = ocasionArray.filter((oc) => ocasionesValidas.includes(oc));

    const storageTarget = getImageStorageTarget(process.env);
    const canStoreInR2 = await enforceR2SoftLimit(res, filePath);
    if (!canStoreInR2) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (convertedFilePath && fs.existsSync(convertedFilePath)) fs.unlinkSync(convertedFilePath);
      return;
    }

    let imagen_url;
    if (storageTarget === 'r2') {
      if (clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(filePath, clase_nombre, confianzaValue);
      }
      const result = await uploadToR2(filePath);
      imagen_url = result.url;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (convertedFilePath && fs.existsSync(convertedFilePath)) fs.unlinkSync(convertedFilePath);
    } else if (storageTarget === 'cloudinary') {
      if (clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(filePath, clase_nombre, confianzaValue);
      }
      const result = await uploadImage(filePath);
      imagen_url = result.secure_url;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (convertedFilePath && fs.existsSync(convertedFilePath)) fs.unlinkSync(convertedFilePath);
    } else {
      const userDir = path.join(__dirname, '../uploads', userId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      const finalPath = path.join(userDir, req.file.filename);
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.copyFileSync(convertedFilePath, finalPath);
        imagen_url = `/uploads/${userId}/${req.file.filename}`;
        fs.unlinkSync(convertedFilePath);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } else {
        fs.renameSync(req.file.path, finalPath);
        imagen_url = `/uploads/${userId}/${req.file.filename}`;
      }
      if (clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(finalPath, clase_nombre, confianzaValue);
      }
    }

    const prenda = new Prenda({
      userId,
      imagen_url,
      tipo: tipoFinal,
      clase_nombre: clase_nombre || 'desconocido',
      color: color || 'desconocido',
      confianza: confianzaValue,
      ocasion: ocasionArray
    });

    await prenda.save();
    res.status(201).json(prenda);
  } catch (error) {
    console.error('Error subiendo prenda:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting temporary file:', e);
      }
    }
    if (convertedFilePath && fs.existsSync(convertedFilePath)) {
      try {
        fs.unlinkSync(convertedFilePath);
      } catch (e) {
        console.error('Error deleting converted file:', e);
      }
    }

    const message = error.message || 'Error uploading the garment';
    const isValidation = error.name === 'ValidationError';
    res.status(500).json({
      error: isValidation ? message : 'Error uploading the garment',
      details: message
    });
  }
});

router.get('/', async (req, res) => {
  const mongoose = require('mongoose');
  const userId = getUserId(req);
  if (mongoose.connection.readyState !== 1) {
    return res.json([]);
  }
  try {
    const timeoutMs = 10000;
    const findPromise = Prenda.find(userFilter(userId)).sort({ fecha_agregada: -1 }).lean();
    const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('DB timeout')), timeoutMs));
    const prendas = await Promise.race([findPromise, timeoutPromise]);
    res.json(prendas);
  } catch (error) {
    console.error('Error obteniendo prendas:', error);
    res.json([]);
  }
});

router.get('/filter', async (req, res) => {
  const userId = getUserId(req);
  try {
    const { type } = req.query;
    const query = userFilter(userId);
    const tipoValidos = ['superior', 'inferior', 'zapatos', 'accesorio', 'abrigo', 'vestido'];
    if (typeof type === 'string' && tipoValidos.includes(type.toLowerCase())) {
      query.tipo = type.toLowerCase();
    }
    const prendas = await Prenda.find(query).sort({ fecha_agregada: -1 });
    res.json(prendas);
  } catch (error) {
    console.error('Error filtrando prendas:', error);
    res.status(500).json({ error: 'Error filtering garments' });
  }
});

router.get('/:id', async (req, res) => {
  const userId = getUserId(req);
  const oid = parseObjectId(req.params.id);
  if (!oid) {
    return res.status(400).json({ error: 'Invalid garment id' });
  }
  try {
    const prenda = await Prenda.findOne({ _id: oid, ...userFilter(userId) }).lean();
    if (!prenda) {
      return res.status(404).json({ error: 'Garment not found' });
    }
    res.json(prenda);
  } catch (error) {
    console.error('Error obteniendo prenda:', error);
    res.status(500).json({ error: 'Error getting garment' });
  }
});

router.put('/:id/ocasion', async (req, res) => {
  const userId = getUserId(req);
  const oid = parseObjectId(req.params.id);
  if (!oid) {
    return res.status(400).json({ error: 'Invalid garment id' });
  }
  try {
    const { ocasion } = req.body;
    const prenda = await Prenda.findOne({ _id: oid, ...userFilter(userId) });
    if (!prenda) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    let ocasionArray = [];
    if (ocasion) {
      ocasionArray = Array.isArray(ocasion) ? ocasion : [ocasion];
    }

    const ocasionesValidas = ['casual', 'formal', 'deportivo', 'fiesta', 'trabajo'];
    ocasionArray = ocasionArray.filter(oc => ocasionesValidas.includes(oc));

    prenda.ocasion = ocasionArray;
    await prenda.save();

    res.json({ message: 'Occasions updated successfully', prenda });
  } catch (error) {
    console.error('Error actualizando ocasiones:', error);
    res.status(500).json({ error: 'Error updating occasions' });
  }
});

router.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  const oid = parseObjectId(req.params.id);
  if (!oid) {
    return res.status(400).json({ error: 'Invalid garment id' });
  }
  try {
    const prenda = await Prenda.findOneAndDelete({ _id: oid, ...userFilter(userId) });
    if (!prenda) {
      return res.status(404).json({ error: 'Garment not found' });
    }
    if (prenda.imagen_url.startsWith('/uploads/')) {
      const filePath = resolveUploadsPublicPath(prenda.imagen_url, UPLOADS_ROOT);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (prenda.imagen_url.includes('cloudinary')) {
      await deleteImage(prenda.imagen_url);
    } else if (isR2Configured()) {
      await deleteFromR2(prenda.imagen_url);
    }

    res.json({ message: 'Garment deleted successfully' });
  } catch (error) {
    console.error('Error eliminando prenda:', error);
    res.status(500).json({ error: 'Error deleting the garment' });
  }
});

router.post('/auto', async (req, res) => {
  const userId = getUserId(req);
  try {
    const { tipo, color, imagen_base64, clase_nombre, confianza, ocasion } = req.body;

    if (!imagen_base64 || !tipo || !color) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const canAddMorePrendas = await enforcePrendasCountLimit(res, userId);
    if (!canAddMorePrendas) {
      return;
    }

    const imageBuffer = Buffer.from(imagen_base64, 'base64');
    const userDir = path.join(__dirname, '../uploads', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = `auto-${Date.now()}-${randomFileSuffix()}.jpg`;
    const filePath = path.join(userDir, filename);

    await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(filePath);
    const storageTarget = getImageStorageTarget(process.env);
    const canStoreInR2 = await enforceR2SoftLimit(res, filePath);
    if (!canStoreInR2) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    let confianzaValue = confianza != null && confianza !== '' ? parseFloat(confianza) : 0.5;
    if (Number.isNaN(confianzaValue) || confianzaValue < 0) confianzaValue = 0;
    if (confianzaValue > 1) confianzaValue = 1;

    let imagen_url = `/uploads/${userId}/${filename}`;
    if (storageTarget === 'r2') {
      if (clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(filePath, clase_nombre, confianzaValue);
      }
      const uploaded = await uploadToR2(filePath);
      imagen_url = uploaded.url;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else if (storageTarget === 'cloudinary') {
      if (clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(filePath, clase_nombre, confianzaValue);
      }
      const uploaded = await uploadImage(filePath);
      imagen_url = uploaded.secure_url;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    let ocasionArray = [];
    if (ocasion) {
      ocasionArray = Array.isArray(ocasion) ? ocasion : [ocasion];
      const ocasionesValidas = ['casual', 'formal', 'deportivo', 'fiesta', 'trabajo'];
      ocasionArray = ocasionArray.filter(oc => ocasionesValidas.includes(oc));
    }

    const prenda = new Prenda({
      userId,
      imagen_url,
      tipo,
      color,
      clase_nombre: clase_nombre || 'desconocido',
      confianza: confianzaValue,
      ocasion: ocasionArray
    });

    await prenda.save();

    if (storageTarget === 'local' && clase_nombre && confianzaValue >= MIN_CONFIDENCE_FOR_DATASET) {
        copyToDataset(filePath, clase_nombre, confianzaValue);
    }

    res.status(201).json({
        message: 'Garment added automatically',
        prenda
    });
  } catch (error) {
    console.error('Error adding garment automatically:', error);
    res.status(500).json({ error: 'Error adding the garment' });
  }
});

module.exports = router;

