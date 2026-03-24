const express = require('express');
const axios = require('axios');
const Prenda = require('../models/Prenda');
const UserProfile = require('../models/UserProfile');
const { getUserId } = require('../middleware/auth');

const router = express.Router();

/** Same filter as prendas/outfits routes */
function userFilter(userId) {
  if (userId === 'anonymous') {
    return { $or: [{ userId: 'anonymous' }, { userId: { $exists: false } }] };
  }
  return { userId };
}

const MAX_MESSAGES = 24;
const MAX_CONTENT_PER_MESSAGE = 4000;
const MAX_TOTAL_USER_CHARS = 12000;

const SLOT_EN = {
  superior: 'top',
  inferior: 'bottom',
  zapatos: 'shoes',
  accesorio: 'accessory',
  abrigo: 'coat',
  vestido: 'dress'
};

/** Human-readable lines for the model—no database IDs (avoids ref. [id:…] in replies). */
function formatWardrobe(prendas) {
  if (!prendas.length) {
    return 'The user has no garments in the wardrobe yet. Ask them to upload photos under Garments before suggesting specific outfits.';
  }
  return prendas
    .map((p, i) => {
      const slot = SLOT_EN[p.tipo] || p.tipo;
      const cls =
        p.clase_nombre && String(p.clase_nombre).toLowerCase() !== 'desconocido'
          ? String(p.clase_nombre).replace(/_/g, ' ')
          : 'piece';
      const col =
        p.color && String(p.color).toLowerCase() !== 'desconocido' ? p.color : 'unspecified color';
      const occ =
        Array.isArray(p.ocasion) && p.ocasion.length ? p.ocasion.join(', ') : 'no occasion tags yet';
      return `${i + 1}. ${slot}: ${col} ${cls} — occasions: ${occ}.`;
    })
    .join('\n');
}

function formatPreferences(profile) {
  if (!profile) return 'No saved profile preferences.';
  const parts = [
    profile.colores?.length ? `preferred colors: ${profile.colores.join(', ')}` : null,
    profile.ocasion ? `usual occasion: ${profile.ocasion}` : null,
    profile.estilo ? `style: ${profile.estilo}` : null,
    profile.style_preference ? `style preference: ${profile.style_preference}` : null,
    `dress: ${profile.incluirVestido ? 'yes' : 'no'}, coat: ${profile.incluirAbrigo ? 'yes' : 'no'}, layers: ${profile.layeredTop ? 'yes' : 'no'}, tops: ${profile.topPreference || 'any'}`
  ].filter(Boolean);
  return parts.join('\n');
}

function validateClientMessages(messages) {
  if (!Array.isArray(messages)) {
    return { error: 'messages must be an array' };
  }
  if (messages.length === 0) {
    return { error: 'Send at least one message' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { error: `Maximum ${MAX_MESSAGES} messages per request` };
  }
  let total = 0;
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return { error: `Message ${i + 1}: invalid format` };
    }
    if (m.role === 'system') {
      return { error: 'Do not send messages with role system' };
    }
    if (m.role !== 'user' && m.role !== 'assistant') {
      return { error: `Message ${i + 1}: role must be user or assistant` };
    }
    const content = m.content;
    if (typeof content !== 'string' || !content.trim()) {
      return { error: `Message ${i + 1}: empty or non-string content` };
    }
    if (content.length > MAX_CONTENT_PER_MESSAGE) {
      return { error: `Message ${i + 1}: too long (max ${MAX_CONTENT_PER_MESSAGE} characters)` };
    }
    if (m.role === 'user') total += content.length;
  }
  if (total > MAX_TOTAL_USER_CHARS) {
    return { error: 'Total user text volume is too large' };
  }
  const last = messages[messages.length - 1];
  if (last.role !== 'user') {
    return { error: 'Last message must be from the user' };
  }
  return null;
}

/**
 * Strip any ID / ref patterns the model might still emit (hard guarantee for the client).
 */
function sanitizeAssistantReply(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text;
  // (ref. [id:hex]), ref. [id:hex], [id:hex]
  s = s.replace(/\(\s*ref\.?\s*\[id:[a-f0-9]+\]\s*\)/gi, '');
  s = s.replace(/\bref\.?\s*\[id:[a-f0-9]+\]/gi, '');
  s = s.replace(/\[id:[a-f0-9]+\]/gi, '');
  // Bare 24-char hex in brackets (Mongo ObjectId shape)
  s = s.replace(/\s*\[([a-f0-9]{24})\]/gi, '');
  // Trailing junk before punctuation after removal
  s = s.replace(/\s+([.,;:!?])/g, '$1');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

const SYSTEM_INSTRUCTIONS = `You are a personal style assistant for the Fashion AI app.

Language: Always write your full reply in English only, even if the user writes in Spanish or another language.

How to describe outfits (critical):
- Use only natural descriptions: colors, garment types, fit, mood (e.g. "a clean white tee with your dark navy trousers and black sneakers").
- Prefer short paragraphs or a few simple bullets that paint the look—no technical labels, no Spanish slot names like Superior/Inferior.
- NEVER include brackets with IDs, "ref.", hex codes, or anything that looks like a database key. The user must never see [id:…] or similar.
- Do not copy words like "tipo", "clase", or line numbers from the inventory; speak as a stylist would to a friend.

Tone:
- Sound human and supportive. Say why the combo works and that you think it would look great on them.

Other rules:
- Only suggest pieces that match the inventory below. If something is missing, say so kindly.
- You may chat about plans, weather, occasion, comfort, and taste.
- If the inventory is empty, ask them to add garments under Garments first.
- No medical or financial advice. Keep replies concise unless the user asks for more detail.`;

/**
 * POST /api/chat
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 */
router.post('/', async (req, res) => {
  const openrouter = req.app.locals.openrouter;
  if (!openrouter?.isConfigured) {
    return res.status(503).json({
      error: 'OpenRouter not configured',
      hint: 'Set OPENROUTER_API_KEY in backend/.env'
    });
  }

  const err = validateClientMessages(req.body?.messages);
  if (err) {
    return res.status(400).json({ error: err.error });
  }

  const userId = getUserId(req);
  const rawSub = req.auth?.payload?.sub || 'anonymous';

  try {
    const [prendas, profile] = await Promise.all([
      Prenda.find(userFilter(userId)).sort({ fecha_agregada: -1 }).lean(),
      UserProfile.findOne({ user_id: { $in: [rawSub, userId] } }).lean()
    ]);

    const wardrobeBlock = formatWardrobe(prendas);
    const prefsBlock = formatPreferences(profile);

    const systemContent = `${SYSTEM_INSTRUCTIONS}

--- Current wardrobe (metadata only; no images in this context) ---
${wardrobeBlock}

--- Profile preferences ---
${prefsBlock}`;

    const apiMessages = [
      { role: 'system', content: systemContent },
      ...req.body.messages.map((m) => ({
        role: m.role,
        content: m.content.trim()
      }))
    ];

    const { data } = await axios.post(
      `${openrouter.baseUrl}/chat/completions`,
      {
        model: openrouter.model,
        messages: apiMessages,
        temperature: 0.45,
        max_tokens: 1200
      },
      {
        headers: {
          Authorization: `Bearer ${openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': req.get('origin') || 'http://localhost:3000',
          'X-Title': 'FashionAI Wardrobe Chat'
        },
        timeout: 60000
      }
    );

    let reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({
        error: 'Empty model response',
        detail: data?.choices?.[0] ?? null
      });
    }

    reply = sanitizeAssistantReply(reply);

    return res.json({
      reply,
      message: { role: 'assistant', content: reply }
    });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.error?.message ?? err.message;
    console.error('[Chat] OpenRouter error:', message);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'Chat failed',
      detail: message
    });
  }
});

module.exports = router;
