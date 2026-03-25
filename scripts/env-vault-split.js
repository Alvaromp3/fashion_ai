#!/usr/bin/env node
/**
 * Split root .env (from dotenv-vault pull) → backend/.env, frontend/.env, frontend/.env.local
 * Run from repo root after: dotenv-vault pull [production|development]
 */
const path = require('path');
const { existsUnder, readRequiredUtf8, writeUtf8 } = require('./lib/resolve-under.cjs');

const ROOT = path.resolve(__dirname, '..');

const H = { backend: '# --- BACKEND ---', frontend: '# --- FRONTEND ---', frontendLocal: '# --- FRONTEND_LOCAL ---' };

function split(content) {
  const out = { backend: [], frontend: [], frontendLocal: [] };
  let cur = null;
  const hasSections = content.includes(H.backend);

  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (t === H.backend) { cur = 'backend'; continue; }
    if (t === H.frontend) { cur = 'frontend'; continue; }
    if (t === H.frontendLocal) { cur = 'frontendLocal'; continue; }
    if (hasSections && cur) out[cur].push(line);
    else if (!hasSections) out.backend.push(line);
  }

  return {
    backend: out.backend.join('\n').replace(/\n+$/, ''),
    frontend: out.frontend.join('\n').replace(/\n+$/, ''),
    frontendLocal: out.frontendLocal.join('\n').replace(/\n+$/, ''),
  };
}

function defaultFrontend() {
  return 'VITE_AUTH0_DOMAIN=\nVITE_AUTH0_CLIENT_ID=\nVITE_AUTH0_AUDIENCE=\nVITE_AUTH0_CALLBACK_URL=https://fashion-ai.pages.dev\nVITE_API_BASE_URL=https://fashion-ai-backend-c6wd.onrender.com\n';
}

function defaultFrontendLocal() {
  return 'VITE_AUTH0_CALLBACK_URL=http://localhost:3000\nVITE_API_BASE_URL=\n';
}

if (!existsUnder(ROOT, '.env')) {
  console.error('Root .env not found. Run: npm run env:vault-pull or env:vault-pull:dev');
  process.exit(1);
}

const { backend, frontend, frontendLocal } = split(readRequiredUtf8(ROOT, '.env'));

writeUtf8(ROOT, 'backend', '.env', backend ? backend + '\n' : '');
writeUtf8(
  ROOT,
  'frontend',
  '.env',
  (frontend && !frontend.includes('# (empty)')) ? frontend + '\n' : defaultFrontend()
);
writeUtf8(
  ROOT,
  'frontend',
  '.env.local',
  /VITE_/.test(frontendLocal || '') && frontendLocal.trim() ? frontendLocal + '\n' : defaultFrontendLocal()
);

console.log('Split → backend/.env, frontend/.env, frontend/.env.local');
