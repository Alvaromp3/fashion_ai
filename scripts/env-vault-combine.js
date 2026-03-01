#!/usr/bin/env node
/**
 * Combine backend/.env + frontend/.env + frontend/.env.local → root .env
 * (for dotenv-vault push). Run from repo root.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = {
  out: path.join(ROOT, '.env'),
  backend: path.join(ROOT, 'backend', '.env'),
  frontend: path.join(ROOT, 'frontend', '.env'),
  frontendLocal: path.join(ROOT, 'frontend', '.env.local'),
};

const H = {
  backend: '# --- BACKEND ---',
  frontend: '# --- FRONTEND ---',
  frontendLocal: '# --- FRONTEND_LOCAL ---',
};

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';
}

const backend = read(FILES.backend);
if (!backend) {
  console.error('backend/.env missing or empty. Run env:vault-pull first.');
  process.exit(1);
}

const env = (process.argv[2] || 'development').toLowerCase();
const envComment = env === 'production' ? '# production' : '# development';

const body = [
  envComment,
  '',
  H.backend,
  backend,
  '',
  H.frontend,
  read(FILES.frontend) || '# (empty)',
  '',
  H.frontendLocal,
  read(FILES.frontendLocal) || '# (empty)',
].join('\n');

fs.writeFileSync(FILES.out, body + '\n', 'utf8');
console.log('Combined → .env (' + env + ')');
