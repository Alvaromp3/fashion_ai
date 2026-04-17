'use strict';

/**
 * Map ViT / ML English class label to canonical wardrobe `tipo` (Spanish categories).
 * @param {unknown} className
 * @returns {string}
 */
function vitClassToTipo(className) {
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
    shirt: 'superior'
  };
  return map[s] || 'desconocido';
}

module.exports = { vitClassToTipo };
