const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Mirror system prompt for OpenRouter: defines stylist role and JSON output format.
 * @constant {string}
 */
const SYSTEM_PROMPT = `You are the FashionAI Mirror stylist: a senior fashion consultant. Your output is shown directly to the user in a professional product.

## Your role
- Analyze the outfit visible in the image (garments, colors, fit, formality).
- Use the provided context (event, weather, time, style preference) to assess occasion fit and give actionable advice.
- Write in a calm, precise, editorial tone. No emojis, no filler, no casual slang. Short sentences. Second person ("you") when giving feedback is fine.

## Output rules
- **analysis.style_identity**: One clear style label (e.g. "Minimal smart casual", "Relaxed business casual"). No long phrases.
- **analysis.silhouette_balance**: One short sentence on proportions and silhouette (e.g. "Balanced proportions; relaxed silhouette.").
- **analysis.color_analysis**: Use palette_type (e.g. "Neutral", "Monochromatic"), contrast_level (e.g. "Low", "Medium"), harmony_score as integer 0–100.
- **analysis.fit_evaluation**: One short sentence on fit (e.g. "Loose fit; comfortable and casual.").
- **analysis.occasion_alignment**: One short sentence on whether the outfit fits the stated occasion (e.g. "Well aligned with business casual." or "Too casual for the stated occasion.").
- **analysis.seasonal_match**: One short sentence on season/context (e.g. "Suitable for mild weather and indoor settings.").
- **analysis.overall_score**: Integer 0–100. Reflect how well the outfit meets the context and style.
- **analysis.confidence_score**: Integer 0–100. How confident you are in the visual analysis.
- **analysis.expert_feedback**: Two to four sentences. Direct, constructive, professional. Summarise the main point and give one or two clear recommendations. Write in full sentences, no bullet points inside this field.
- **analysis.upgrade_suggestions**: Array of 2–4 strings. Each string is one concrete suggestion (e.g. "Add a blazer or tailored jacket for a more polished look."). Start with a verb when natural. No numbering or bullets in the strings.

## Detected garments (new_detected_items)
- If you can identify distinct garments in the image that are not in the user's wardrobe, add them to **new_detected_items**.
- For each item: name (short, e.g. "Graphic T-shirt"), category (e.g. "top"), primary_color, secondary_color (or ""), fit_type (e.g. "relaxed"), style_category (e.g. "casual"), season (e.g. "all-season"), formality_level (e.g. "informal"), versatility_score (0–100), recommend_add_to_database (true/false).
- If no clear extra garments beyond the main outfit, return an empty array [].

## Response format
Reply with only valid JSON. No markdown, no code fences, no text before or after the JSON. Use this exact structure:

{
  "analysis": {
    "style_identity": "",
    "silhouette_balance": "",
    "color_analysis": {
      "palette_type": "",
      "contrast_level": "",
      "harmony_score": 0
    },
    "fit_evaluation": "",
    "occasion_alignment": "",
    "seasonal_match": "",
    "overall_score": 0,
    "confidence_score": 0,
    "expert_feedback": "",
    "upgrade_suggestions": []
  },
  "new_detected_items": [
    {
      "name": "",
      "category": "",
      "primary_color": "",
      "secondary_color": "",
      "fit_type": "",
      "style_category": "",
      "season": "",
      "formality_level": "",
      "versatility_score": 0,
      "recommend_add_to_database": true
    }
  ]
}`;

/**
 * Parse JSON from model content (handles optional markdown code fence).
 * @param {string} [content] - Raw response text
 * @returns {object|null} Parsed object or null
 */
function parseJsonFromContent(content) {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** GET /api/mirror/status — OpenRouter config check */
router.get('/status', (req, res) => {
  const openrouter = req.app.locals.openrouter;
  res.json({
    openrouter: {
      configured: Boolean(openrouter?.isConfigured),
      model: openrouter?.model || null,
      baseUrl: openrouter?.baseUrl || null
    }
  });
});

/** POST /api/mirror/analyze — text-only analysis (no image) */
router.post('/analyze', async (req, res) => {
  const openrouter = req.app.locals.openrouter;
  if (!openrouter?.isConfigured) {
    return res.status(503).json({
      error: 'OpenRouter not configured',
      hint: 'Set OPENROUTER_API_KEY in backend/.env'
    });
  }

  const userPrompt = req.body?.userPrompt ?? req.body?.user_prompt ?? '';
  if (!userPrompt.trim()) {
    return res.status(400).json({ error: 'userPrompt is required' });
  }

  try {
    const { data } = await axios.post(
      `${openrouter.baseUrl}/chat/completions`,
      {
        model: openrouter.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt.trim() }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': req.get('origin') || 'http://localhost:3000'
        },
        timeout: 60000
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseJsonFromContent(content);
    if (parsed) {
      return res.json(parsed);
    }
    return res.status(502).json({
      error: 'Invalid JSON from model',
      raw: content ? content.slice(0, 500) : null
    });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.error?.message ?? err.message;
    console.error('[Mirror] OpenRouter error:', message);
    return res.status(status).json({
      error: 'Mirror analysis failed',
      detail: message
    });
  }
});

/** POST /api/mirror/analyze-frame — image + context analysis (vision) */
router.post('/analyze-frame', async (req, res) => {
  const openrouter = req.app.locals.openrouter;
  if (!openrouter?.isConfigured) {
    return res.status(503).json({
      error: 'OpenRouter not configured',
      hint: 'Set OPENROUTER_API_KEY in backend/.env'
    });
  }

  const imageDataUrl = req.body?.imageDataUrl ?? req.body?.image_data_url ?? req.body?.imageUrl ?? req.body?.image_url ?? '';
  const context = req.body?.context ?? {};
  const userNotes = (req.body?.userNotes ?? req.body?.user_notes ?? '').toString();

  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return res.status(400).json({ error: 'imageDataUrl is required' });
  }
  const isDataImage = imageDataUrl.startsWith('data:image/');
  const isHttpImage = /^https?:\/\//i.test(imageDataUrl);
  if (!isDataImage && !isHttpImage) {
    return res.status(400).json({ error: 'imageDataUrl must be a data:image/... URL or http(s) URL' });
  }

  // Límite simple para evitar payloads enormes (base64).
  if (isDataImage && imageDataUrl.length > 8_000_000) {
    return res.status(413).json({ error: 'imageDataUrl too large (max ~8MB string)' });
  }

  const lines = [
    'Evaluate the outfit in the attached image and return the analysis as JSON only.',
    '',
    'Context:',
    `Event: ${context?.event ?? '—'}`,
    `Weather / location: ${context?.weather ?? '—'}`,
    `Time of day: ${context?.time ?? '—'}`,
    `Style preference: ${context?.user_profile?.style_preference ?? '—'}`,
    context?.location ? `Location (coordinates): ${context.location}` : '',
    '',
    userNotes.trim() ? `User notes: ${userNotes.trim()}` : '',
    userNotes.trim() ? '' : '',
    'Using this context, provide: (1) style, silhouette, color, fit, occasion alignment, and seasonal match; (2) overall score and confidence (0–100); (3) brief expert feedback in full sentences; (4) 2–4 concrete upgrade suggestions; (5) any clearly visible garments as new_detected_items. Reply with only the JSON object, no markdown or extra text.'
  ].filter(Boolean);

  const userText = lines.join('\n');

  try {
    const { data } = await axios.post(
      `${openrouter.baseUrl}/chat/completions`,
      {
        model: openrouter.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1200
      },
      {
        headers: {
          'Authorization': `Bearer ${openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': req.get('origin') || 'http://localhost:3000',
          'X-Title': 'FashionAI Mirror'
        },
        timeout: 65000
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseJsonFromContent(content);
    if (parsed) return res.json(parsed);
    return res.status(502).json({
      error: 'Invalid JSON from model',
      raw: content ? content.slice(0, 1000) : null
    });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const message = err.response?.data?.error?.message ?? err.response?.data?.error ?? err.message;
    const providerPayload = err.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : null;
    console.error('[Mirror] OpenRouter vision error:', message, providerPayload ? `| payload: ${providerPayload}` : '');
    return res.status(status).json({
      error: 'Mirror frame analysis failed',
      detail: message
    });
  }
});

module.exports = router;
