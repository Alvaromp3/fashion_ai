#!/usr/bin/env node
/**
 * Sync backend/.env to Render backend service environment variables via the Render API.
 * The Render CLI does not support setting env vars; this script uses the API.
 *
 * Requires:
 *   - RENDER_API_KEY (create at https://dashboard.render.com/u/settings#api-keys)
 *   - RENDER_SERVICE_ID (e.g. srv-xxxx), or Render CLI installed so we can resolve by name
 *
 * Run from repo root: npm run render:env
 * Or: node scripts/render-env-sync.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = 'https://api.render.com/v1';
const ENV_FILE = path.join(__dirname, '..', 'backend', '.env');
const SERVICE_NAME = 'fashion-ai-backend';

// Keys we never send to Render (script-only, local-only, or set by Render)
const SKIP_KEYS = new Set(['FLASK_ENV', 'FLASK_SECRET_KEY', 'BACKEND_URL', 'RENDER_API_KEY', 'RENDER_SERVICE_ID', 'PORT']);
const RENDER_SYSTEM_PREFIX = 'RENDER_';

/** Load RENDER_API_KEY and RENDER_SERVICE_ID from backend/.env (and root .env) when run from repo root. */
function loadRenderCredsFromEnv() {
  const envFiles = [
    path.join(__dirname, '..', 'backend', '.env'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const filePath of envFiles) {
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const keyUpper = key.toUpperCase();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (keyUpper === 'RENDER_API_KEY') process.env.RENDER_API_KEY = value;
      if (keyUpper === 'RENDER_SERVICE_ID') process.env.RENDER_SERVICE_ID = value;
    }
  }
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`.env not found: ${filePath}`);
  }
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key.length < 2) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    const keyUpper = key.toUpperCase();
    if (SKIP_KEYS.has(key) || keyUpper === 'RENDER_API_KEY' || keyUpper === 'RENDER_SERVICE_ID' || key.startsWith(RENDER_SYSTEM_PREFIX)) continue;
    out.push({ key, value });
  }
  return out;
}

function getServiceIdFromCli() {
  try {
    const { execSync } = require('child_process');
    const out = execSync('render services -o json --confirm', { encoding: 'utf8', shell: true });
    const list = JSON.parse(out);
    const services = Array.isArray(list) ? list : list.services || [];
    const svc = services.find((s) => (s.name || s.service?.name) === SERVICE_NAME) || services.find((s) => (s.name || s.service?.name || '').toLowerCase().includes('fashion-ai-backend'));
    const id = svc?.id || svc?.service?.id;
    if (id) return id;
  } catch (_) {
    // CLI not installed or not logged in
  }
  return null;
}

function request(method, pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    // pathname is e.g. /services/srv-xxx/env-vars; API_BASE is https://api.render.com/v1
    const pathWithBase = pathname.startsWith('/') ? API_BASE.replace(/\/$/, '') + pathname : API_BASE + '/' + pathname;
    const url = new URL(pathWithBase);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };
    if (body && (method === 'PUT' || method === 'PATCH' || method === 'POST')) {
      opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed?.message || `HTTP ${res.statusCode}: ${data}`));
        } catch (e) {
          reject(new Error(data || res.statusCode));
        }
      });
    });
    req.on('error', reject);
    if (body && (method === 'PUT' || method === 'PATCH' || method === 'POST')) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  loadRenderCredsFromEnv();
  const apiKey = process.env.RENDER_API_KEY?.trim();
  let serviceId = process.env.RENDER_SERVICE_ID?.trim();

  if (!apiKey) {
    console.error('RENDER_API_KEY is required. Create one at https://dashboard.render.com/u/settings#api-keys');
    process.exit(1);
  }

  if (!serviceId) {
    console.log('RENDER_SERVICE_ID not set; resolving service ID from Render CLI...');
    serviceId = getServiceIdFromCli();
    if (!serviceId) {
      console.error('Set RENDER_SERVICE_ID to your backend service ID (e.g. srv-xxxx).');
      console.error('Get it: render services -o json (then find fashion-ai-backend).');
      process.exit(1);
    }
    console.log('Resolved service ID:', serviceId);
  }

  const envVars = parseEnvFile(ENV_FILE);
  console.log(`Syncing ${envVars.length} variables from backend/.env to Render...`);

  // Render API: GET returns list of env vars; PUT replaces env vars for the service.
  // GET /v1/services/:serviceId/env-vars
  // PUT /v1/services/:serviceId/env-vars  body: [ { key, value }, ... ]
  let existing = [];
  try {
    const getRes = await request('GET', `/services/${serviceId}/env-vars`, null, apiKey);
    existing = getRes?.envVars ?? (Array.isArray(getRes) ? getRes : []);
    if (!Array.isArray(existing)) existing = [];
    // Keep Render system vars (read-only); we'll only send our .env keys
  } catch (e) {
    if (e.message && !e.message.includes('404')) {
      console.warn('Could not fetch existing env vars:', e.message);
    }
  }

  // Build map: existing by key, then overlay .env (so .env wins)
  const byKey = new Map();
  for (const o of existing) {
    const k = o.key || o.envVar?.key;
    if (k && !k.startsWith(RENDER_SYSTEM_PREFIX)) byKey.set(k, o.value ?? o.envVar?.value ?? '');
  }
  for (const { key, value } of envVars) {
    byKey.set(key, value);
  }
  const toSend = Array.from(byKey.entries()).map(([key, value]) => ({ key, value }));

  try {
    await request('PUT', `/services/${serviceId}/env-vars`, toSend, apiKey);
    console.log('Done. Environment variables updated on Render. Trigger a deploy for them to take effect.');
    console.log('  npm run render:deploy   or   render deploys create', serviceId, '--wait');
  } catch (e) {
    console.error('Failed to update env vars:', e.message);
    process.exit(1);
  }
}

main();
