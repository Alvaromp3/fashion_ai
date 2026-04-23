'use strict';

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

/**
 * @param {object|null} superior
 * @param {object|null} superiorSecundario
 * @param {object} inferior
 * @param {object} zapato
 * @param {{ colores?: string[], ocasion?: string, estilo?: string }} preferencias
 * @param {string} comboKey
 */
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
    // Pullover: recommender only uses T-shirt/Pullover tops; include for formal smart-casual (FR-2).
    if (occ === 'formal' && (top?.clase_nombre === 'Shirt' || top?.clase_nombre === 'Coat' || top?.clase_nombre === 'Dress' || top?.clase_nombre === 'Pullover')) add = 16;
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

module.exports = {
  scoreOutfitCompatibility,
  hashString,
  FORMALITY,
  COLOR_PALETTES
};
