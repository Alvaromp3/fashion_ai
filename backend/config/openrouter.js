/**
 * Configuración de OpenRouter en el servidor.
 * Uses backend/.env (config is in backend/config/).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;
const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
/** Model with audio output (TTS via OpenRouter streaming). */
const audioModel = process.env.OPENROUTER_AUDIO_MODEL || 'openai/gpt-audio-mini';
/**
 * Model with audio *input* for speech-to-text. Must accept input_audio in chat/completions.
 * gpt-audio-mini is tuned for TTS and often refuses or ignores transcription — use a preview/audio-input model here.
 */
const sttModel = process.env.OPENROUTER_STT_MODEL?.trim() || 'openai/gpt-4o-audio-preview';
const ttsVoice = process.env.OPENROUTER_TTS_VOICE || 'alloy';
const ttsFormat = process.env.OPENROUTER_TTS_FORMAT || 'wav';

module.exports = {
  apiKey,
  baseUrl,
  model,
  audioModel,
  sttModel,
  ttsVoice,
  ttsFormat,
  isConfigured: Boolean(apiKey)
};
