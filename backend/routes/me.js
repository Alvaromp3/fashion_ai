const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { parseAuthSubject, filterEqString } = require('../utils/mongoSafe');

function emptyAssistantContext() {
  return {
    weather: '',
    time_of_day: '',
    location_label: '',
    notes: ''
  };
}

function normalizeAssistantContext(raw) {
  const d = emptyAssistantContext();
  if (!raw || typeof raw !== 'object') return d;
  const trim = (s, max = 2000) => {
    if (typeof s !== 'string') return '';
    return s.trim().slice(0, max);
  };
  return {
    weather: trim(raw.weather, 200),
    time_of_day: trim(raw.time_of_day, 200),
    location_label: trim(raw.location_label, 500),
    notes: trim(raw.notes, 2000)
  };
}

function preferencesPayloadFromDoc(profile) {
  if (!profile) {
    return {
      colores: [],
      ocasion: '',
      estilo: '',
      incluirVestido: false,
      incluirAbrigo: false,
      layeredTop: false,
      topPreference: 'any',
      style_preference: '',
      age: null,
      height_cm: null,
      weight_kg: null,
      assistant_context: emptyAssistantContext()
    };
  }
  const ac = profile.assistant_context || {};
  return {
    colores: profile.colores || [],
    ocasion: profile.ocasion || '',
    estilo: profile.estilo || '',
    incluirVestido: Boolean(profile.incluirVestido),
    incluirAbrigo: Boolean(profile.incluirAbrigo),
    layeredTop: Boolean(profile.layeredTop),
    topPreference: profile.topPreference || 'any',
    style_preference: profile.style_preference || '',
    age: profile.age != null ? profile.age : null,
    height_cm: profile.height_cm != null ? profile.height_cm : null,
    weight_kg: profile.weight_kg != null ? profile.weight_kg : null,
    assistant_context: {
      weather: ac.weather || '',
      time_of_day: ac.time_of_day || '',
      location_label: ac.location_label || '',
      notes: ac.notes || ''
    }
  };
}

/**
 * GET /api/me — current user info and roles (for frontend useIsAdmin)
 */
router.get('/', (req, res) => {
  const payload = req.auth && req.auth.payload;
  const rolesClaim = process.env.AUTH0_ROLES_CLAIM || 'https://fashion-ai-api/roles';
  const roles = (payload && Array.isArray(payload[rolesClaim])) ? payload[rolesClaim] : [];
  res.json({
    sub: req.user?.sub,
    email: payload?.email ?? null,
    name: payload?.name ?? null,
    roles,
    isAdmin: roles.includes('admin')
  });
});

/**
 * GET /api/me/preferences — get current user's saved preferences and profile fields
 */
router.get('/preferences', async (req, res) => {
  try {
    const uid = parseAuthSubject(req.user?.sub);
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const filter = filterEqString('user_id', uid);
    const profile = await UserProfile.findOne(filter).lean();
    res.json(preferencesPayloadFromDoc(profile));
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Error fetching preferences' });
  }
});

/**
 * PUT /api/me/preferences — upsert current user's preferences (partial updates supported)
 */
router.put('/preferences', async (req, res) => {
  try {
    const uid = parseAuthSubject(req.user?.sub);
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      colores,
      ocasion,
      estilo,
      incluirVestido,
      incluirAbrigo,
      layeredTop,
      topPreference,
      style_preference,
      age,
      height_cm,
      weight_kg,
      assistant_context
    } = req.body;

    const set = {
      user_id: uid,
      updated_at: new Date()
    };
    const unset = {};

    if (Array.isArray(colores)) set.colores = colores;
    if (typeof ocasion === 'string') set.ocasion = ocasion;
    if (typeof estilo === 'string') set.estilo = estilo;
    if (typeof incluirVestido === 'boolean') set.incluirVestido = incluirVestido;
    if (typeof incluirAbrigo === 'boolean') set.incluirAbrigo = incluirAbrigo;
    if (typeof layeredTop === 'boolean') set.layeredTop = layeredTop;
    if (typeof topPreference === 'string') set.topPreference = topPreference;
    if (typeof style_preference === 'string') set.style_preference = style_preference;

    if (Object.prototype.hasOwnProperty.call(req.body, 'age')) {
      if (age === null || age === '') {
        unset.age = 1;
      } else {
        const n = Number(age);
        if (!Number.isFinite(n) || n < 0 || n > 120) {
          return res.status(400).json({ error: 'age must be between 0 and 120, or null to clear' });
        }
        set.age = Math.round(n);
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'height_cm')) {
      if (height_cm === null || height_cm === '') {
        unset.height_cm = 1;
      } else {
        const n = Number(height_cm);
        if (!Number.isFinite(n) || n < 50 || n > 260) {
          return res.status(400).json({ error: 'height_cm must be between 50 and 260, or null to clear' });
        }
        set.height_cm = Math.round(n * 10) / 10;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'weight_kg')) {
      if (weight_kg === null || weight_kg === '') {
        unset.weight_kg = 1;
      } else {
        const n = Number(weight_kg);
        if (!Number.isFinite(n) || n < 20 || n > 400) {
          return res.status(400).json({ error: 'weight_kg must be between 20 and 400, or null to clear' });
        }
        set.weight_kg = Math.round(n * 10) / 10;
      }
    }

    if (assistant_context != null && typeof assistant_context === 'object') {
      set.assistant_context = normalizeAssistantContext(assistant_context);
    }

    const update = Object.keys(unset).length
      ? { $set: set, $unset: unset }
      : { $set: set };

    const profile = await UserProfile.findOneAndUpdate(
      filterEqString('user_id', uid),
      update,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(preferencesPayloadFromDoc(profile));
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Error saving preferences' });
  }
});

module.exports = router;
