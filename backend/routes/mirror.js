const express = require('express');
const axios = require('axios');
const router = express.Router();
const { validateMirrorImageUrl } = require('../utils/safeMirrorImageUrl');

/**
 * Mirror system prompt for OpenRouter: defines stylist role and JSON output format.
 * Feedback is always preparation-oriented for the stated occasion; no negative opinion of the outfit.
 * @constant {string}
 */
const SYSTEM_PROMPT = `You are the FashionAI Mirror stylist: a senior fashion consultant. Your output is shown in a professional product.

## Your role
- Analyze the outfit visible in the image (garments, colors, fit, formality).
- Use the provided context (event/occasion, weather, time, style preference) to give advice that helps the user **prepare for that occasion**.
- Do **not** judge or criticise the outfit (e.g. avoid "too casual", "does not convey", "lacks"). Instead, focus on what works and what could make the look more aligned with the occasion.
- Write in a calm, precise, supportive tone. Short sentences. Second person ("you") when giving tips. No emojis, no filler.

## Output rules
- **analysis.style_identity**: One clear style label (e.g. "Minimal smart casual", "Relaxed business casual"). No long phrases.
- **analysis.silhouette_balance**: One short sentence on proportions and silhouette (e.g. "Balanced proportions; relaxed silhouette.").
- **analysis.color_analysis**: Use palette_type (e.g. "Neutral", "Monochromatic"), contrast_level (e.g. "Low", "Medium"), harmony_score as integer 0–100.
- **analysis.fit_evaluation**: One short sentence on fit (e.g. "Comfortable fit; works for the context.").
- **analysis.occasion_alignment**: One short, neutral or positive sentence on how the look fits the stated occasion (e.g. "Fits a business casual setting." or "A few tweaks would align it fully with business casual."). Do not use negative or harsh wording.
- **analysis.seasonal_match**: One short sentence on season/context (e.g. "Suitable for mild weather and indoor settings.").
- **analysis.overall_score**: Integer 0–100. Reflect how well the outfit can work for the stated occasion (generous but honest).
- **analysis.confidence_score**: Integer 0–100. How confident you are in the visual analysis.
- **analysis.expert_feedback**: Two to four sentences. **Preparation-focused**: help the user get ready for the stated occasion (e.g. business casual). Say what already works, then one or two concrete tips to strengthen the look for that occasion. Be constructive and positive. No criticism of the outfit. Example tone: "Your silhouette and colors work well. For a business casual meeting, adding a tailored blazer or a crisp shirt would sharpen the look. Consider closed-toe shoes if the setting is formal."
- **analysis.upgrade_suggestions**: Array of 2–4 strings. Each string is one concrete, positive suggestion to better match the occasion (e.g. "Add a blazer or tailored jacket for business casual."). Start with a verb when natural. No numbering or bullets. Frame as tips, not as fixes for something wrong.

## Detected garments (new_detected_items)
- If you can identify distinct garments in the image that are not in the user's wardrobe, add them to **new_detected_items**.
- For each item: name (short), category, primary_color, secondary_color (or ""), fit_type, style_category, season, formality_level, versatility_score (0–100), recommend_add_to_database (true/false).
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
  "new_detected_items": []
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

  const urlCheck = validateMirrorImageUrl(imageDataUrl);
  if (!urlCheck.ok) {
    return res.status(400).json({ error: urlCheck.reason });
  }
  const safeImageUrl = urlCheck.url;

  // Límite simple para evitar payloads enormes (base64).
  if (isDataImage && imageDataUrl.length > 8_000_000) {
    return res.status(413).json({ error: 'imageDataUrl too large (max ~8MB string)' });
  }

  const lines = [
    'Analyze the outfit in the attached image. The user is preparing for the occasion described below.',
    'Give preparation-focused feedback: what works for that occasion and 1–2 concrete tips to strengthen the look. Do not criticise or judge the outfit; keep tone supportive and constructive.',
    '',
    'Context:',
    `Event / occasion: ${context?.event ?? '—'}`,
    `Weather / location: ${context?.weather ?? '—'}`,
    `Time of day: ${context?.time ?? '—'}`,
    `Style preference: ${context?.user_profile?.style_preference ?? '—'}`,
    context?.location ? `Location: ${context.location}` : '',
    '',
    userNotes.trim() ? `User notes: ${userNotes.trim()}` : '',
    userNotes.trim() ? '' : '',
    'Return: (1) style, silhouette, color, fit, occasion alignment, seasonal match; (2) overall score and confidence (0–100); (3) expert_feedback focused on preparing for the stated occasion; (4) 2–4 upgrade_suggestions as tips; (5) new_detected_items if you see distinct garments. Reply with only the JSON object, no markdown or extra text.'
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
              { type: 'image_url', image_url: { url: safeImageUrl } }
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
