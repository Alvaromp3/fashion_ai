const express = require('express');
const axios = require('axios');
const Prenda = require('../models/Prenda');
const UserProfile = require('../models/UserProfile');
const { getUserId } = require('../middleware/auth');

const router = express.Router();

const MAX_TTS_CHARS = 6000;
const MAX_AUDIO_BASE64_CHARS = 6 * 1024 * 1024; // ~4.5MB binary when decoded

function openrouterChatHeaders(req, title) {
  const openrouter = req.app.locals.openrouter;
  return {
    Authorization: `Bearer ${openrouter.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': req.get('origin') || 'http://localhost:3000',
    'X-Title': title
  };
}

/**
 * Parse OpenRouter SSE stream; collect base64 audio chunks from delta.audio.data
 */
function consumeOpenRouterSseStream(stream) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const audioChunks = [];
    const transcriptChunks = [];

    stream.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const audio = json.choices?.[0]?.delta?.audio;
          if (audio?.data) audioChunks.push(audio.data);
          if (audio?.transcript) transcriptChunks.push(audio.transcript);
        } catch (_) {
          /* ignore malformed chunk */
        }
      }
    });
    stream.on('end', () => {
      resolve({
        audioBase64: audioChunks.join(''),
        transcript: transcriptChunks.join('')
      });
    });
    stream.on('error', reject);
  });
}

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

function formatUserBodyAndContext(profile) {
  if (!profile) return 'No saved body metrics or assistant context.';
  const bodyParts = [];
  if (profile.age != null && Number.isFinite(profile.age)) bodyParts.push(`age: ${profile.age}`);
  if (profile.height_cm != null && Number.isFinite(profile.height_cm)) {
    bodyParts.push(`height: ${profile.height_cm} cm`);
  }
  if (profile.weight_kg != null && Number.isFinite(profile.weight_kg)) {
    bodyParts.push(`weight: ${profile.weight_kg} kg`);
  }
  const ac = profile.assistant_context || {};
  const ctxParts = [];
  if (ac.weather && String(ac.weather).trim()) ctxParts.push(`weather: ${String(ac.weather).trim()}`);
  if (ac.time_of_day && String(ac.time_of_day).trim()) {
    ctxParts.push(`time of day: ${String(ac.time_of_day).trim()}`);
  }
  if (ac.location_label && String(ac.location_label).trim()) {
    ctxParts.push(`location: ${String(ac.location_label).trim()}`);
  }
  if (ac.notes && String(ac.notes).trim()) {
    ctxParts.push(`user notes: ${String(ac.notes).trim()}`);
  }
  const lines = [];
  if (bodyParts.length) lines.push(`User-provided metrics (for fit and styling context only, not medical advice): ${bodyParts.join('; ')}`);
  if (ctxParts.length) lines.push(`Default context for today (use unless the user contradicts): ${ctxParts.join('; ')}`);
  if (!lines.length) return 'No saved body metrics or assistant context.';
  return lines.join('\n');
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

/** OpenRouter may return string or multimodal content array. */
function messageContentToString(content) {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string') return p.text;
        return '';
      })
      .join('')
      .trim();
  }
  return String(content);
}

/** Model refused STT and answered like a chat assistant (common with wrong audio model). */
function looksLikeSttRefusal(text) {
  if (!text || typeof text !== 'string') return false;
  if (text.length > 1200) return false;
  const t = text.toLowerCase();
  if (/can'?t transcribe|cannot transcribe|can'?t process audio|unable to (listen to |process |hear )?audio/i.test(t))
    return true;
  if (/i'?m sorry.*\b(audio|listen|hear|transcri)/i.test(t)) return true;
  if (/don'?t have (the )?ability.*audio|not able to.*audio/i.test(t)) return true;
  return /sorry.*however.*outfit|transcribe.*however.*outfit|tell me more about.*occasion/i.test(t);
}

const OUTFIT_PARAMS_START = '<<<OUTFIT_PARAMS>>>';
const OUTFIT_PARAMS_END = '<<<END_OUTFIT_PARAMS>>>';

const ALLOWED_OUTFIT_COLORES = new Set([
  'negro',
  'blanco',
  'gris',
  'rojo',
  'azul',
  'verde',
  'amarillo',
  'naranja',
  'rosa',
  'beige',
  'marrón'
]);

const ALLOWED_OUTFIT_OCASION = new Set(['casual', 'formal', 'deportivo', 'fiesta', 'trabajo']);
const ALLOWED_OUTFIT_ESTILO = new Set(['minimalista', 'colorido', 'elegante', 'moderno']);
const ALLOWED_TOP_PREF = new Set(['any', 'tshirt', 'pullover']);

/**
 * Map model output to the same shape as /api/outfits/recommend query prefs (Spanish keys).
 */
function normalizeOutfitGenerationParams(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const colores = Array.isArray(raw.colores)
    ? [
        ...new Set(
          raw.colores
            .map((c) => (typeof c === 'string' ? c.trim().toLowerCase() : ''))
            .map((c) => (c === 'marron' ? 'marrón' : c))
            .filter((c) => ALLOWED_OUTFIT_COLORES.has(c))
        )
      ]
    : [];

  let ocasion = typeof raw.ocasion === 'string' ? raw.ocasion.trim().toLowerCase() : '';
  if (!ALLOWED_OUTFIT_OCASION.has(ocasion)) ocasion = '';

  let estilo = typeof raw.estilo === 'string' ? raw.estilo.trim().toLowerCase() : '';
  if (!ALLOWED_OUTFIT_ESTILO.has(estilo)) estilo = '';

  const topRaw = typeof raw.topPreference === 'string' ? raw.topPreference.trim().toLowerCase() : 'any';
  const topPreference = ALLOWED_TOP_PREF.has(topRaw) ? topRaw : 'any';

  const asBool = (v) => v === true || v === 'true';

  return {
    colores,
    ocasion,
    estilo,
    incluirVestido: asBool(raw.incluirVestido),
    incluirAbrigo: asBool(raw.incluirAbrigo),
    layeredTop: asBool(raw.layeredTop),
    topPreference
  };
}

/**
 * Split assistant text into user-visible reply + structured prefs for /generate.
 */
function extractOutfitGenerationBlock(text) {
  if (!text || typeof text !== 'string') {
    return { visible: text, outfitGeneration: null };
  }
  const startIdx = text.indexOf(OUTFIT_PARAMS_START);
  if (startIdx === -1) {
    return { visible: text.trim(), outfitGeneration: null };
  }
  const afterStart = startIdx + OUTFIT_PARAMS_START.length;
  const endIdx = text.indexOf(OUTFIT_PARAMS_END, afterStart);
  const jsonSlice =
    endIdx === -1 ? text.slice(afterStart).trim() : text.slice(afterStart, endIdx).trim();
  let outfitGeneration = null;
  try {
    outfitGeneration = normalizeOutfitGenerationParams(JSON.parse(jsonSlice));
  } catch (_) {
    outfitGeneration = null;
  }
  const tail = endIdx === -1 ? '' : text.slice(endIdx + OUTFIT_PARAMS_END.length);
  const visible = (text.slice(0, startIdx) + tail).trim();
  return { visible, outfitGeneration };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove any OUTFIT_PARAMS markers / JSON block leaked into user-visible text. */
function stripOutfitParamMarkers(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text;
  const start = escapeRegExp(OUTFIT_PARAMS_START);
  const end = escapeRegExp(OUTFIT_PARAMS_END);
  s = s.replace(new RegExp(`${start}[\\s\\S]*?${end}`, 'g'), '');
  s = s.replace(new RegExp(`${start}[\\s\\S]*`, 'g'), '');
  s = s.replace(new RegExp(end, 'g'), '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** User asked for concrete outfits / looks (triggers recommend even if the model skipped JSON). */
function wantsOutfitEngineFromUserText(text) {
  const t = (text || '').trim();
  if (!t) return false;
  return /(generate|create|build|give me|suggest|need|want|show me|help me).{0,52}(outfit|look|idea|combin|something to wear)|\boutfit\b|\blooks?\b.*\b(wear|tonight|today|now)|what (should|can) i wear|ideas? for|dress me|style me|\brisk\b|\bbold\b|\bedgy\b|\bdaring\b|statement look|going out|night out|put together|what (goes|pairs)|how about.{0,30}(wear|look|outfit)/i.test(
    t
  );
}

/** Latest user message in the thread that clearly asks for outfit help (not only the very last turn). */
function latestOutfitIntentUserMessage(messages) {
  if (!Array.isArray(messages)) return '';
  const userTexts = messages
    .filter((m) => m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .reverse();
  for (const text of userTexts) {
    if (wantsOutfitEngineFromUserText(text)) return text;
  }
  return '';
}

/** Assistant reply looks like a concrete outfit suggestion (so we can run /recommend + show cards). */
function wantsOutfitEngineFromAssistantText(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  const bulletCount = (text.match(/^\s*[-•*]\s+/gm) || []).length;
  const hasGarment =
    /\b(t-?shirts?|tees?|trousers?|pants?|jeans|chinos|boots?|ankle boots?|sneakers?|shoes?|coat|jacket|overcoat|pullover|sweaters?|hoodies?|skirts?|dresses?|blazers?)\b/i.test(
      text
    );
  const hasPitch =
    /how about|pair (it|this|them)|finish the look|complete (the |your )?outfit|this combination|striking contrast|for a bold|daring outfit|sleek base|polished finish|confident vibe/i.test(
      t
    );
  return hasGarment && (bulletCount >= 2 || hasPitch);
}

function inferOutfitGenerationFromAssistantText(text) {
  if (!text || typeof text !== 'string') return null;
  const base = {
    colores: [],
    ocasion: '',
    estilo: '',
    incluirVestido: false,
    incluirAbrigo: false,
    layeredTop: false,
    topPreference: 'any'
  };
  if (/bold|daring|edgy|sleek|striking|confident|modern|polished|stylish/i.test(text)) base.estilo = 'moderno';
  if (/\bblack\b/i.test(text)) base.colores.push('negro');
  if (/navy|dark blue|dark navy/i.test(text)) base.colores.push('azul');
  if (/\bwhite\b|cream|off-?white/i.test(text)) base.colores.push('blanco');
  if (/\bgre(y|ish)|\bgris\b/i.test(text)) base.colores.push('gris');
  if (/brown|tan|beige|camel|marr[oó]n/i.test(text)) base.colores.push('marrón');
  if (/coat|jacket|overcoat|blazer/i.test(text)) base.incluirAbrigo = true;
  if (/dress\b/i.test(text) && !/address/i.test(text)) base.incluirVestido = true;
  if (/t-?shirt|tee\b/i.test(text) && /pullover|sweater|hoodie|layer/i.test(text)) base.layeredTop = true;
  else if (/t-?shirt|tee\b/i.test(text)) base.topPreference = 'tshirt';
  if (/pullover|sweater|hoodie/i.test(text) && !/t-?shirt|tee\b/i.test(text)) base.topPreference = 'pullover';

  base.colores = [...new Set(base.colores)];
  if (!base.estilo && base.colores.length === 0) return null;
  return base;
}

function inferOutfitGenerationFromUserText(text) {
  if (!wantsOutfitEngineFromUserText(text)) return null;
  const t = text.toLowerCase();
  const base = {
    colores: [],
    ocasion: '',
    estilo: '',
    incluirVestido: false,
    incluirAbrigo: false,
    layeredTop: false,
    topPreference: 'any'
  };
  if (/risk|bold|edgy|daring|statement|rebel|street|grunge/i.test(text)) {
    base.estilo = 'moderno';
    base.colores = ['negro'];
  }
  if (/all black|total black|black on black/i.test(t)) {
    base.colores = Array.from(new Set([...(base.colores || []), 'negro']));
  }
  if (/\bnavy\b|azul marino/i.test(t)) {
    base.colores = Array.from(new Set([...(base.colores || []), 'azul']));
  }
  if (/party|night out|club|fiesta|celebrat/i.test(t)) base.ocasion = 'fiesta';
  else if (/formal|gala|wedding|interview|black tie/i.test(t)) {
    base.ocasion = 'formal';
    if (!base.estilo) base.estilo = 'elegante';
  } else if (/work|office|meeting|job interview/i.test(t)) base.ocasion = 'trabajo';
  else if (/gym|sport|run|workout|training|yoga/i.test(t)) base.ocasion = 'deportivo';
  else if (/casual|weekend|coffee|brunch|hangout/i.test(t)) base.ocasion = 'casual';

  if (/coat|jacket|cold|winter|layer|rain|freezing/i.test(t)) base.incluirAbrigo = true;
  if (/layered|overshirt|shirt and sweater/i.test(t)) base.layeredTop = true;
  if (/\bdress\b/i.test(t)) base.incluirVestido = true;

  return base;
}

function isOutfitGenerationWeak(gen) {
  if (!gen) return true;
  return (
    (!gen.colores || gen.colores.length === 0) &&
    !gen.ocasion &&
    !gen.estilo &&
    !gen.incluirVestido &&
    !gen.incluirAbrigo &&
    !gen.layeredTop &&
    (gen.topPreference === 'any' || !gen.topPreference)
  );
}

function mergeOutfitGeneration(parsed, inferred) {
  if (!inferred) return parsed;
  if (!parsed) return inferred;
  return normalizeOutfitGenerationParams({
    colores: parsed.colores?.length ? parsed.colores : inferred.colores,
    ocasion: parsed.ocasion || inferred.ocasion,
    estilo: parsed.estilo || inferred.estilo,
    incluirVestido: !!(parsed.incluirVestido || inferred.incluirVestido),
    incluirAbrigo: !!(parsed.incluirAbrigo || inferred.incluirAbrigo),
    layeredTop: !!(parsed.layeredTop || inferred.layeredTop),
    topPreference:
      parsed.topPreference && parsed.topPreference !== 'any'
        ? parsed.topPreference
        : inferred.topPreference || 'any'
  });
}

const SYSTEM_INSTRUCTIONS = `You are a personal style assistant for the Fashion AI app.

Language: Always write your full reply in English only, even if the user writes in Spanish or another language.

Ground every suggestion in THEIR wardrobe (critical):
- You only know their clothes from the numbered wardrobe list in this prompt (no photos). In basically every reply where you mention clothing, make that obvious: e.g. "Finish the look with the black ankle boots you already have in your wardrobe," "pair it with your dark navy trousers from the pieces you uploaded," "that black T-shirt you added works great as a base."
- Vary wording: "in your wardrobe," "among your saved garments," "from what you've uploaded," "the items you own here," "you're already working with"—so it never sounds generic.
- Do not claim you see photos; you only infer from the list. If the list doesn't have something they asked for, say so kindly.

How to describe outfits:
- Natural colors, garment types, fit, mood. Short paragraphs or a few bullets.
- NEVER include brackets with IDs, "ref.", hex codes, or database-style keys. No Spanish slot names (superior/inferior) in user-facing text.
- Do not copy "tipo", "clase", or line numbers from the inventory.

Tone:
- Human, supportive; say why the combo works.

Other rules:
- Only suggest pieces that appear in the inventory list below. If something is missing, say so.
- You may chat about plans, weather, occasion, comfort, and taste.
- If the inventory is empty, ask them to add garments first.
- No medical or financial advice. Stay concise unless they ask for more.

When the user asks to generate, show, or build outfits (e.g. "generate a risk outfit", "bold look", "what should I wear"), you MUST write the wardrobe-grounded description AND fill the JSON block below (e.g. bold/edgy → estilo "moderno", colores including "negro"). Never skip the JSON block on those turns.

Outfit generator (required every reply):
After your message to the user, add ONE blank line, then append the machine-readable block ALONE at the very end (never inside a sentence; never repeat the marker names in the prose above). The server removes this block from what the user sees. Use EXACT markers and valid JSON only between them:

${OUTFIT_PARAMS_START}
{"colores":[],"ocasion":"","estilo":"","incluirVestido":false,"incluirAbrigo":false,"topPreference":"any","layeredTop":false}
${OUTFIT_PARAMS_END}

Fill JSON from the conversation and your styling advice so the app can call the real outfit engine:
- colores: array of zero or more from: negro, blanco, gris, rojo, azul, verde, amarillo, naranja, rosa, beige, marrón
- ocasion: one of casual, formal, deportivo, fiesta, trabajo — use "" if unclear
- estilo: one of minimalista, colorido, elegante, moderno — use "" if unclear
- incluirVestido: true only if a dress-based look fits and the user/inventory supports it
- incluirAbrigo: true if outerwear fits (cold, formal layer, etc.)
- layeredTop: true only for tee + pullover layered looks (inventory must allow)
- topPreference: "any", "tshirt", or "pullover"

Always output the block; use empty array, empty strings, and false booleans when unsure.`;

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
    const bodyContextBlock = formatUserBodyAndContext(profile);

    const systemContent = `${SYSTEM_INSTRUCTIONS}

--- Current wardrobe (metadata only; no images in this context) ---
${wardrobeBlock}

--- Profile preferences ---
${prefsBlock}

--- User context (metrics and default weather/plans) ---
${bodyContextBlock}`;

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
        headers: openrouterChatHeaders(req, 'FashionAI Wardrobe Chat'),
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

    const lastUserContent =
      [...req.body.messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
    const intentUserText = latestOutfitIntentUserMessage(req.body.messages);
    const textForUserInfer = intentUserText || lastUserContent;

    const inferredRaw = inferOutfitGenerationFromUserText(textForUserInfer);
    const inferredNorm = inferredRaw ? normalizeOutfitGenerationParams(inferredRaw) : null;

    const { visible, outfitGeneration: parsedGen } = extractOutfitGenerationBlock(reply);
    let outfitGeneration = parsedGen;

    if (inferredNorm && wantsOutfitEngineFromUserText(textForUserInfer)) {
      outfitGeneration = mergeOutfitGeneration(parsedGen, inferredNorm);
    } else if (!outfitGeneration && inferredNorm) {
      outfitGeneration = inferredNorm;
    } else if (outfitGeneration && isOutfitGenerationWeak(outfitGeneration) && inferredNorm) {
      outfitGeneration = mergeOutfitGeneration(outfitGeneration, inferredNorm);
    }

    const visiblePreclean = stripOutfitParamMarkers(visible);
    const assistantPitch = wantsOutfitEngineFromAssistantText(visiblePreclean);
    const fromAssistantRaw = inferOutfitGenerationFromAssistantText(visiblePreclean);
    const assistantNorm = fromAssistantRaw ? normalizeOutfitGenerationParams(fromAssistantRaw) : null;
    const assistantFallback = normalizeOutfitGenerationParams({
      colores: [],
      ocasion: '',
      estilo: 'moderno',
      incluirVestido: false,
      incluirAbrigo: false,
      layeredTop: false,
      topPreference: 'any'
    });

    if (assistantPitch) {
      const aNorm = assistantNorm && !isOutfitGenerationWeak(assistantNorm) ? assistantNorm : assistantFallback;
      outfitGeneration = mergeOutfitGeneration(outfitGeneration, aNorm);
    }

    reply = sanitizeAssistantReply(visiblePreclean);
    if (!reply && outfitGeneration) {
      reply =
        'Here are outfit combinations from your wardrobe based on what you asked for—scroll down to see them.';
    }
    if (!reply) {
      return res.status(502).json({
        error: 'Empty model response',
        detail: data?.choices?.[0] ?? null
      });
    }

    return res.json({
      reply,
      outfitGeneration,
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

/**
 * POST /api/chat/transcribe
 * Body: { audioBase64: string, format?: string } — format e.g. webm, wav, mp3 (model-dependent)
 */
router.post('/transcribe', async (req, res) => {
  const openrouter = req.app.locals.openrouter;
  if (!openrouter?.isConfigured) {
    return res.status(503).json({
      error: 'OpenRouter not configured',
      hint: 'Set OPENROUTER_API_KEY in backend/.env'
    });
  }

  const audioBase64 =
    typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
    return res.status(400).json({ error: 'Audio payload too large' });
  }

  let format = typeof req.body?.format === 'string' ? req.body.format.trim().toLowerCase() : 'webm';
  if (!/^[a-z0-9]+$/.test(format)) {
    return res.status(400).json({ error: 'Invalid audio format' });
  }

  const sttModel = openrouter.sttModel || 'openai/gpt-4o-audio-preview';

  try {
    const { data } = await axios.post(
      `${openrouter.baseUrl}/chat/completions`,
      {
        model: sttModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a speech-to-text engine. The user will send one short audio clip. Reply with ONLY the exact words spoken, in the same language as the speech. No preamble, apologies, or offers to help with outfits or anything else. No quotation marks wrapping the whole reply. If there is no intelligible speech, reply with exactly: silence'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe this audio. Output only the spoken words.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format
                }
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 2000
      },
      {
        headers: openrouterChatHeaders(req, 'FashionAI STT'),
        timeout: 120000
      }
    );

    let text = messageContentToString(data?.choices?.[0]?.message?.content).trim();
    if (!text) {
      return res.status(502).json({
        error: 'Empty transcription',
        detail: data?.choices?.[0] ?? null
      });
    }
    if (looksLikeSttRefusal(text)) {
      console.warn('[Chat/transcribe] Model refused or ignored audio (reply looks like chat):', text.slice(0, 200));
      return res.status(502).json({
        error: 'Transcription refused by the speech model',
        hint:
          'Use a model that accepts audio input. Set OPENROUTER_STT_MODEL=openai/gpt-4o-audio-preview (or another audio-input model) in backend/.env and restart the server.',
        detail: text.slice(0, 500)
      });
    }
    if (/^silence\.?$/i.test(text)) {
      return res.status(502).json({
        error: 'No speech detected',
        hint: 'Speak closer to the mic or check that the browser is using the correct microphone.'
      });
    }
    text = sanitizeAssistantReply(text);
    return res.json({ text });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.error?.message ?? err.message;
    console.error('[Chat/transcribe] OpenRouter error:', message);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'Transcription failed',
      detail: message
    });
  }
});

/**
 * POST /api/chat/tts
 * Body: { text: string } — returns base64 WAV (or OPENROUTER_TTS_FORMAT) for playback
 */
router.post('/tts', async (req, res) => {
  const openrouter = req.app.locals.openrouter;
  if (!openrouter?.isConfigured) {
    return res.status(503).json({
      error: 'OpenRouter not configured',
      hint: 'Set OPENROUTER_API_KEY in backend/.env'
    });
  }

  const raw = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!raw) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (raw.length > MAX_TTS_CHARS) {
    return res.status(400).json({ error: `text too long (max ${MAX_TTS_CHARS} characters)` });
  }

  const ttsFormat = openrouter.ttsFormat || 'wav';
  const voice = openrouter.ttsVoice || 'alloy';

  const prompt = `Read the following text aloud for the user. Speak it naturally and completely; do not add introductions or commentary—only the words below:\n\n${raw}`;

  try {
    const response = await axios.post(
      `${openrouter.baseUrl}/chat/completions`,
      {
        model: openrouter.audioModel,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['text', 'audio'],
        audio: { voice, format: ttsFormat },
        stream: true,
        max_tokens: 4096
      },
      {
        headers: openrouterChatHeaders(req, 'FashionAI TTS'),
        responseType: 'stream',
        timeout: 180000
      }
    );

    const { audioBase64, transcript } = await consumeOpenRouterSseStream(response.data);
    if (!audioBase64) {
      return res.status(502).json({
        error: 'No audio in model response',
        hint: 'Check OPENROUTER_AUDIO_MODEL supports audio output',
        transcript: transcript || null
      });
    }

    const mime =
      ttsFormat === 'mp3'
        ? 'audio/mpeg'
        : ttsFormat === 'opus'
          ? 'audio/opus'
          : ttsFormat === 'wav'
            ? 'audio/wav'
            : `audio/${ttsFormat}`;

    return res.json({
      audioBase64,
      format: ttsFormat,
      mimeType: mime
    });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.error?.message ?? err.message;
    console.error('[Chat/tts] OpenRouter error:', message);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'Text-to-speech failed',
      detail: message
    });
  }
});

module.exports = router;
