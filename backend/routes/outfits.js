const express = require('express');
const router = express.Router();
const Outfit = require('../models/Outfit');
const Prenda = require('../models/Prenda');
const { getUserId } = require('../middleware/auth');
const { parseObjectId } = require('../utils/mongoSafe');
const { scoreOutfitCompatibility } = require('../utils/outfitScore');

function userFilter(userId) {
  if (userId === 'anonymous') {
    return { $or: [{ userId: 'anonymous' }, { userId: { $exists: false } }] };
  }
  return { userId };
}

router.get('/recommend', async (req, res) => {
  const userId = getUserId(req);
  try {
    const preferencias = {
      colores: req.query.colores ? JSON.parse(req.query.colores) : [],
      ocasion: req.query.ocasion || '',
      estilo: req.query.estilo || '',
      incluirVestido: req.query.incluirVestido === 'true',
      topPreference: req.query.topPreference || 'any',
      incluirAbrigo: req.query.incluirAbrigo === 'true',
      layeredTop: req.query.layeredTop === 'true'
    };

    let superiores = await Prenda.find({ userId, tipo: 'superior' });
    const inferiores = await Prenda.find({ userId, tipo: 'inferior' });
    const zapatos = await Prenda.find({ userId, tipo: 'zapatos' });
    const abrigos = preferencias.incluirAbrigo ? await Prenda.find({ userId, tipo: 'abrigo' }) : [];
    let vestidos = [];
    if (preferencias.incluirVestido) {
      vestidos = await Prenda.find({ userId, tipo: 'vestido' });
    }

    if (superiores.length === 0 || inferiores.length === 0 || zapatos.length === 0) {
      return res.status(400).json({
        error: 'Not enough garments to generate outfits. You need at least 1 top, 1 bottom and 1 shoe.'
      });
    }

    const outfits = [];
    const combinacionesUsadas = new Set();
    // Excluir combinaciones ya mostradas (para "generar 3 más")
    const excludeRaw = req.query.exclude;
    if (excludeRaw) {
      try {
        const keys = typeof excludeRaw === 'string' ? excludeRaw.split(',') : [];
        keys.forEach(k => combinacionesUsadas.add(k.trim()));
      } catch (e) { /* ignore */ }
    }

    let superioresTshirt = superiores.filter(p => p.clase_nombre === 'T-shirt');
    let superioresPullover = superiores.filter(p => p.clase_nombre === 'Pullover');
    if (!preferencias.layeredTop) {
      if (preferencias.topPreference === 'tshirt') superioresPullover = [];
      if (preferencias.topPreference === 'pullover') superioresTshirt = [];
    }

    const inferioresTrouser = inferiores.filter(p => p.clase_nombre === 'Trouser');
    const zapatosSneaker = zapatos.filter(p => p.clase_nombre === 'Sneaker');

    if (preferencias.layeredTop) {
      if (superioresTshirt.length === 0 || superioresPullover.length === 0) {
        return res.status(400).json({
          error: 'Layered outfit requires at least 1 T-shirt and 1 Pullover.'
        });
      }
    } else if (superioresTshirt.length === 0 && superioresPullover.length === 0) {
      return res.status(400).json({
        error: 'No T-shirt or Pullover available. You need at least one of these top garment types.'
      });
    }

    if (inferioresTrouser.length === 0) {
      return res.status(400).json({ error: 'No pants (Trouser) available.' });
    }
    if (zapatosSneaker.length === 0) {
      return res.status(400).json({ error: 'No sneakers (Sneaker) available.' });
    }

    let tshirtUsado = false;
    let pulloverUsado = false;

    for (let i = 0; i < 50; i++) {
      if (outfits.length >= 10) break;

      let superior;
      let superiorSecundario = null;

      if (preferencias.layeredTop) {
        const tshirt = superioresTshirt[Math.floor(Math.random() * superioresTshirt.length)];
        const pullover = superioresPullover[Math.floor(Math.random() * superioresPullover.length)];
        superior = tshirt;
        superiorSecundario = pullover;
      } else {
        if (superioresTshirt.length > 0 && superioresPullover.length > 0) {
          if (!tshirtUsado && i < 2) {
            superior = superioresTshirt[Math.floor(Math.random() * superioresTshirt.length)];
            tshirtUsado = true;
          } else if (!pulloverUsado && i < 2) {
            superior = superioresPullover[Math.floor(Math.random() * superioresPullover.length)];
            pulloverUsado = true;
          } else {
            const rand = Math.random();
            superior = rand < 0.5
              ? superioresTshirt[Math.floor(Math.random() * superioresTshirt.length)]
              : superioresPullover[Math.floor(Math.random() * superioresPullover.length)];
          }
        } else if (superioresTshirt.length > 0) {
          superior = superioresTshirt[Math.floor(Math.random() * superioresTshirt.length)];
        } else {
          superior = superioresPullover[Math.floor(Math.random() * superioresPullover.length)];
        }
      }

      const inferior = inferioresTrouser[Math.floor(Math.random() * inferioresTrouser.length)];
      const zapato = zapatosSneaker[Math.floor(Math.random() * zapatosSneaker.length)];

      const comboKey = superiorSecundario
        ? `${superior._id}-${superiorSecundario._id}-${inferior._id}-${zapato._id}`
        : `${superior._id}-${inferior._id}-${zapato._id}`;
      if (combinacionesUsadas.has(comboKey)) continue;
      combinacionesUsadas.add(comboKey);

      const { puntuacion, explicaciones } = scoreOutfitCompatibility(
        superior, superiorSecundario, inferior, zapato, preferencias, comboKey
      );

      let abrigo = null;
      let finalPuntuacion = puntuacion;
      if (preferencias.incluirAbrigo && abrigos.length > 0) {
        abrigo = abrigos[Math.floor(Math.random() * abrigos.length)];
        explicaciones.push('Includes coat');
        finalPuntuacion = Math.min(97, puntuacion + 4);
      }

      outfits.push({
        superior,
        superiorSecundario: superiorSecundario || undefined,
        inferior,
        zapatos: zapato,
        abrigo: abrigo || undefined,
        puntuacion: finalPuntuacion,
        explicaciones
      });
    }

    outfits.sort((a, b) => b.puntuacion - a.puntuacion);
    const mejoresOutfits = outfits.slice(0, 3);
    res.json(mejoresOutfits);
  } catch (error) {
    console.error('Error generando recomendaciones:', error);
      res.status(500).json({ error: 'Error generating recommendations' });
  }
});

router.post('/save', async (req, res) => {
  const userId = getUserId(req);
  try {
    const { superior_id, inferior_id, zapatos_id, puntuacion, superior_secundario_id, abrigo_id } = req.body;

    const superiorOid = parseObjectId(superior_id);
    const inferiorOid = parseObjectId(inferior_id);
    const zapatosOid = parseObjectId(zapatos_id);
    if (!superiorOid || !inferiorOid || !zapatosOid) {
      return res.status(400).json({ error: 'Invalid garment id(s)' });
    }

    let secOid = null;
    if (superior_secundario_id != null && superior_secundario_id !== '') {
      secOid = parseObjectId(superior_secundario_id);
      if (!secOid) return res.status(400).json({ error: 'Invalid superior_secundario_id' });
    }

    let abrigoOid = null;
    if (abrigo_id != null && abrigo_id !== '') {
      abrigoOid = parseObjectId(abrigo_id);
      if (!abrigoOid) return res.status(400).json({ error: 'Invalid abrigo_id' });
    }

    const superior = await Prenda.findOne({ _id: superiorOid, userId });
    const inferior = await Prenda.findOne({ _id: inferiorOid, userId });
    const zapatos = await Prenda.findOne({ _id: zapatosOid, userId });

    if (!superior || !inferior || !zapatos) {
      return res.status(404).json({ error: 'One or more garments not found' });
    }

    const outfit = new Outfit({
      userId,
      superior_id: superiorOid,
      inferior_id: inferiorOid,
      zapatos_id: zapatosOid,
      puntuacion: puntuacion || 50,
      ...(secOid && { superior_secundario_id: secOid }),
      ...(abrigoOid && { abrigo_id: abrigoOid })
    });

    await outfit.save();
    await outfit.populate(['superior_id', 'inferior_id', 'zapatos_id', 'superior_secundario_id', 'abrigo_id']);
    res.status(201).json(outfit);
  } catch (error) {
    console.error('Error guardando outfit:', error);
    res.status(500).json({ error: 'Error saving the outfit' });
  }
});

router.get('/', async (req, res) => {
  const userId = getUserId(req);
  try {
    const outfits = await Outfit.find(userFilter(userId))
      .populate('superior_id')
      .populate('inferior_id')
      .populate('zapatos_id')
      .populate('superior_secundario_id')
      .populate('abrigo_id')
      .sort({ fecha_creacion: -1 });
    res.json(outfits);
  } catch (error) {
    console.error('Error obteniendo outfits:', error);
    res.status(500).json({ error: 'Error getting outfits' });
  }
});

router.get('/:id', async (req, res) => {
  const userId = getUserId(req);
  const oid = parseObjectId(req.params.id);
  if (!oid) {
    return res.status(400).json({ error: 'Invalid outfit id' });
  }
  try {
    const outfit = await Outfit.findOne({ _id: oid, ...userFilter(userId) })
      .populate('superior_id')
      .populate('inferior_id')
      .populate('zapatos_id')
      .populate('superior_secundario_id')
      .populate('abrigo_id');
    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }
    res.json(outfit);
  } catch (error) {
    console.error('Error obteniendo outfit:', error);
    res.status(500).json({ error: 'Error getting outfit' });
  }
});

router.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  const oid = parseObjectId(req.params.id);
  if (!oid) {
    return res.status(400).json({ error: 'Invalid outfit id' });
  }
  try {
    const outfit = await Outfit.findOneAndDelete({ _id: oid, ...userFilter(userId) });
    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }
    res.json({ message: 'Outfit deleted successfully' });
  } catch (error) {
    console.error('Error eliminando outfit:', error);
    res.status(500).json({ error: 'Error deleting the outfit' });
  }
});

module.exports = router;

