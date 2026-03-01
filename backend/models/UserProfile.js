const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  colores: { type: [String], default: [] },
  ocasion: { type: String, default: '' },
  estilo: { type: String, default: '' },
  incluirVestido: { type: Boolean, default: false },
  incluirAbrigo: { type: Boolean, default: false },
  layeredTop: { type: Boolean, default: false },
  topPreference: { type: String, default: 'any' },
  style_preference: { type: String, default: '' },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
