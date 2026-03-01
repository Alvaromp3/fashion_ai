const express = require('express');
const router = express.Router();
const Outfit = require('../models/Outfit');
const Prenda = require('../models/Prenda');

// --- Modelo de puntuación: predice compatibilidad del outfit (formalidad + color + preferencias + variación) ---
const FORMALITY = {
  'T-shirt': 1, 'Pullover': 2, 'Shirt': 3, 'Coat': 4, 'Dress': 4,
  'Trouser': 2, 'Sneaker': 1, 'Ankle_boot': 3, 'desconocido': 2
};
const COLOR_PALETTES = [
  ['negro', 'blanco', 'gris'],
  ['azul', 'blanco', 'negro'],
  ['rojo', 'negro', 'blanco'],
  ['verde', 'blanco', 'beige'],
  ['beige', 'blanco', 'marrón'],
  ['gris', 'negro', 'blanco'],
  ['azul', 'gris', 'blanco'],
  ['negro', 'gris'],
  ['blanco', 'beige'],
  ['azul', 'blanco']
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function scoreOutfitCompatibility(superior, superiorSecundario, inferior, zapato, preferencias, comboKey) {
  const explicaciones = [];
  let score = 25; // base

  const top = superiorSecundario || superior;
  const piezas = [superior, inferior, zapato];
  if (superiorSecundario) piezas.push(superiorSecundario);

  const getFormality = (p) => FORMALITY[p?.clase_nombre] ?? FORMALITY.desconocido;
  const formalityTop = Math.max(getFormality(superior), getFormality(superiorSecundario));
  const formalityBottom = getFormality(inferior);
  const formalityShoe = getFormality(zapato);
  const diff = Math.abs(formalityTop - formalityBottom) + Math.abs(formalityTop - formalityShoe);
  if (diff === 0) {
    score += 18;
    explicaciones.push('Formality level matches perfectly');
  } else if (diff <= 1) {
    score += 10;
    explicaciones.push('Coherent formality');
  } else if (diff >= 3) {
    score -= 8;
    explicaciones.push('Mixed formality levels');
  }

  const colores = piezas.map(p => (p.color || '').toLowerCase().trim()).filter(Boolean);
  const hasUnknown = colores.some(c => !c || c === 'desconocido');
  let colorScore = 0;
  const inPalette = COLOR_PALETTES.find(pal => colores.every(c => !c || c === 'desconocido' || pal.some(p => c.includes(p) || p.includes(c))));
  if (inPalette && colores.length >= 2 && !hasUnknown) {
    colorScore = 28;
    explicaciones.push('Colors that match perfectly');
  } else if (inPalette || (colores.length >= 2 && new Set(colores).size <= 2)) {
    colorScore = 15;
    if (!explicaciones.some(e => e.includes('match'))) explicaciones.push('Good color harmony');
  } else if (colores.length >= 2 && new Set(colores).size >= 3) {
    colorScore = 5;
  }

  if (preferencias.colores?.length > 0) {
    const tienePreferido = (preferencias.colores || []).some(cp =>
      piezas.some(p => (p.color || '').toLowerCase().includes(String(cp).toLowerCase()))
    );
    if (tienePreferido) {
      score += 14;
      explicaciones.push('Includes your preferred colors');
    }
  }
  score += colorScore;

  if (preferencias.ocasion) {
    const occ = preferencias.ocasion;
    let add = 0;
    if (occ === 'formal' && (top?.clase_nombre === 'Shirt' || top?.clase_nombre === 'Coat' || top?.clase_nombre === 'Dress')) add = 16;
    else if (occ === 'deportivo' && (superior?.clase_nombre === 'T-shirt' || zapato?.clase_nombre === 'Sneaker')) add = 16;
    else if (occ === 'casual' && ['T-shirt', 'Pullover'].includes(superior?.clase_nombre)) add = 12;
    else if (occ === 'fiesta' && (top?.clase_nombre === 'Dress' || !['negro', 'gris'].includes((top?.color || '').toLowerCase()))) add = 14;
    else if (occ === 'trabajo' && (top?.clase_nombre === 'Shirt' || top?.clase_nombre === 'Coat')) add = 16;
    if (add) {
      score += add;
      explicaciones.push(`Perfect for ${occ} occasion`);
    }
  }

  if (preferencias.estilo) {
    const est = preferencias.estilo;
    const topColor = (top?.color || '').toLowerCase();
    const botColor = (inferior?.color || '').toLowerCase();
    const neutrals = ['negro', 'blanco', 'gris', 'beige'];
    let add = 0;
    if (est === 'minimalista' && neutrals.includes(topColor) && neutrals.includes(botColor)) add = 12;
    else if (est === 'colorido' && (!neutrals.includes(topColor) || !neutrals.includes(botColor))) add = 12;
    else if (est === 'elegante' && (['Coat', 'Dress'].includes(top?.clase_nombre) || zapato?.clase_nombre === 'Ankle_boot')) add = 12;
    else if (est === 'moderno' && (superior?.clase_nombre === 'T-shirt' || zapato?.clase_nombre === 'Sneaker')) add = 10;
    if (add) {
      score += add;
      if (est === 'minimalista') explicaciones.push('Minimalist and elegant style');
      else if (est === 'colorido') explicaciones.push('Colorful and vibrant look');
      else if (est === 'elegante') explicaciones.push('Elegant and sophisticated combination');
      else if (est === 'moderno') explicaciones.push('Modern and current look');
    }
  }

  if (superiorSecundario) {
    score += 8;
    explicaciones.push('Layered look (pullover + T-shirt)');
  }

  const variation = hashString(comboKey) % 16;
  score += variation;

  if (score >= 75) explicaciones.push('High harmony score');
  if (explicaciones.length === 0) explicaciones.push('Classic and versatile combination');

  const puntuacion = Math.max(38, Math.min(97, Math.round(score)));
  return { puntuacion, explicaciones };
}

router.get('/recommend', async (req, res) => {
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

    const ownerId = req.user.sub;
    let superiores = await Prenda.find({ tipo: 'superior', owner_id: ownerId });
    const inferiores = await Prenda.find({ tipo: 'inferior', owner_id: ownerId });
    const zapatos = await Prenda.find({ tipo: 'zapatos', owner_id: ownerId });
    const abrigos = preferencias.incluirAbrigo ? await Prenda.find({ tipo: 'abrigo', owner_id: ownerId }) : [];
    let vestidos = [];
    if (preferencias.incluirVestido) {
      vestidos = await Prenda.find({ tipo: 'vestido', owner_id: ownerId });
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
  try {
    const { superior_id, inferior_id, zapatos_id, puntuacion, superior_secundario_id, abrigo_id } = req.body;
    const ownerId = req.user.sub;

    const superior = await Prenda.findOne({ _id: superior_id, owner_id: ownerId });
    const inferior = await Prenda.findOne({ _id: inferior_id, owner_id: ownerId });
    const zapatos = await Prenda.findOne({ _id: zapatos_id, owner_id: ownerId });

    if (!superior || !inferior || !zapatos) {
      return res.status(404).json({ error: 'One or more garments not found' });
    }

    if (superior_secundario_id) {
      const sec = await Prenda.findOne({ _id: superior_secundario_id, owner_id: ownerId });
      if (!sec) return res.status(404).json({ error: 'Secondary top garment not found' });
    }
    if (abrigo_id) {
      const abr = await Prenda.findOne({ _id: abrigo_id, owner_id: ownerId });
      if (!abr) return res.status(404).json({ error: 'Coat garment not found' });
    }

    const outfit = new Outfit({
      owner_id: ownerId,
      superior_id,
      inferior_id,
      zapatos_id,
      puntuacion: puntuacion || 50,
      ...(superior_secundario_id && { superior_secundario_id }),
      ...(abrigo_id && { abrigo_id })
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
  try {
    const outfits = await Outfit.find({ owner_id: req.user.sub })
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

router.delete('/:id', async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({ _id: req.params.id, owner_id: req.user.sub });
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

