const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
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
 * GET /api/me/preferences — get current user's saved preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user_id: req.user.sub }).lean();
    if (!profile) {
      return res.json({
        colores: [],
        ocasion: '',
        estilo: '',
        incluirVestido: false,
        incluirAbrigo: false,
        layeredTop: false,
        topPreference: 'any',
        style_preference: ''
      });
    }
    res.json({
      colores: profile.colores || [],
      ocasion: profile.ocasion || '',
      estilo: profile.estilo || '',
      incluirVestido: Boolean(profile.incluirVestido),
      incluirAbrigo: Boolean(profile.incluirAbrigo),
      layeredTop: Boolean(profile.layeredTop),
      topPreference: profile.topPreference || 'any',
      style_preference: profile.style_preference || ''
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Error fetching preferences' });
  }
});

/**
 * PUT /api/me/preferences — upsert current user's preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const {
      colores,
      ocasion,
      estilo,
      incluirVestido,
      incluirAbrigo,
      layeredTop,
      topPreference,
      style_preference
    } = req.body;

    const update = {
      user_id: req.user.sub,
      updated_at: new Date(),
      ...(Array.isArray(colores) && { colores }),
      ...(typeof ocasion === 'string' && { ocasion }),
      ...(typeof estilo === 'string' && { estilo }),
      ...(typeof incluirVestido === 'boolean' && { incluirVestido }),
      ...(typeof incluirAbrigo === 'boolean' && { incluirAbrigo }),
      ...(typeof layeredTop === 'boolean' && { layeredTop }),
      ...(typeof topPreference === 'string' && { topPreference }),
      ...(typeof style_preference === 'string' && { style_preference })
    };

    const profile = await UserProfile.findOneAndUpdate(
      { user_id: req.user.sub },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      colores: profile.colores || [],
      ocasion: profile.ocasion || '',
      estilo: profile.estilo || '',
      incluirVestido: Boolean(profile.incluirVestido),
      incluirAbrigo: Boolean(profile.incluirAbrigo),
      layeredTop: Boolean(profile.layeredTop),
      topPreference: profile.topPreference || 'any',
      style_preference: profile.style_preference || ''
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Error saving preferences' });
  }
});

module.exports = router;
