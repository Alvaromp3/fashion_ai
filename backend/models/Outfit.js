const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  /** Auth0 sub (user id). Each user only sees their own outfits. Default for existing docs. */
  userId: {
    type: String,
    required: true,
    default: 'anonymous',
    index: true
  },
  superior_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda',
    required: true
  },
  superior_secundario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda',
    default: null
  },
  inferior_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda',
    required: true
  },
  zapatos_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda',
    required: true
  },
  abrigo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda',
    default: null
  },
  puntuacion: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Outfit', outfitSchema);

