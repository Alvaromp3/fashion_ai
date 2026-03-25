const mongoose = require('mongoose');

const assistantContextSchema = new mongoose.Schema(
  {
    weather: { type: String, default: '' },
    time_of_day: { type: String, default: '' },
    location_label: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

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
  age: { type: Number, min: 0, max: 120 },
  height_cm: { type: Number, min: 50, max: 260 },
  weight_kg: { type: Number, min: 20, max: 400 },
  assistant_context: { type: assistantContextSchema, default: () => ({}) },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
