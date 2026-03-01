const mongoose = require('mongoose');

const prendaSchema = new mongoose.Schema({
  /** Auth0 sub (user id). Each user only sees their own garments. Default for existing docs. */
  userId: {
    type: String,
    required: true,
    default: 'anonymous',
    index: true
  },
  imagen_url: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['superior', 'inferior', 'zapatos', 'accesorio', 'abrigo', 'vestido']
  },
  clase_nombre: {
    type: String,
    default: 'desconocido'
  },
  color: {
    type: String,
    default: 'desconocido'
  },
  confianza: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  ocasion: {
    type: [String],
    enum: ['casual', 'formal', 'deportivo', 'fiesta', 'trabajo'],
    default: []
  },
  fecha_agregada: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prenda', prendaSchema);

