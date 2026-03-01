#!/usr/bin/env node
/**
 * Split root .env (from dotenv-vault pull) → backend/.env, frontend/.env, frontend/.env.local
 * Run from repo root after: dotenv-vault pull [production|development]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROOT_ENV = path.join(ROOT, '.env');
const BACKEND = path.join(ROOT, 'backend', '.env');
const FRONTEND = path.join(ROOT, 'frontend', '.env');
const FRONTEND_LOCAL = path.join(ROOT, 'frontend', '.env.local');

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

if (!fs.existsSync(ROOT_ENV)) {
  console.error('Root .env not found. Run: npm run env:vault-pull or env:vault-pull:dev');
  process.exit(1);
}

const { backend, frontend, frontendLocal } = split(fs.readFileSync(ROOT_ENV, 'utf8'));

fs.writeFileSync(BACKEND, backend ? backend + '\n' : '', 'utf8');
fs.writeFileSync(FRONTEND, (frontend && !frontend.includes('# (empty)')) ? frontend + '\n' : defaultFrontend(), 'utf8');
fs.writeFileSync(FRONTEND_LOCAL, /VITE_/.test(frontendLocal || '') && frontendLocal.trim() ? frontendLocal + '\n' : defaultFrontendLocal(), 'utf8');

console.log('Split → backend/.env, frontend/.env, frontend/.env.local');
