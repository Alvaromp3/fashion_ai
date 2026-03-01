/**
 * Configuración de OpenRouter en el servidor.
 * Uses backend/.env (config is in backend/config/).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;
const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

module.exports = {
  apiKey,
  baseUrl,
  model,
  isConfigured: Boolean(apiKey)
};
