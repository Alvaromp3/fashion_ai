#!/usr/bin/env node
/**
 * Combine backend/.env + frontend/.env + frontend/.env.local → root .env
 * (for dotenv-vault push). Run from repo root.
 */
const path = require('path');
const { readOptionalUtf8, writeUtf8 } = require('./lib/resolve-under.cjs');

const ROOT = path.resolve(__dirname, '..');

const H = {
  backend: '# --- BACKEND ---',
  frontend: '# --- FRONTEND ---',
  frontendLocal: '# --- FRONTEND_LOCAL ---',
};

const backend = readOptionalUtf8(ROOT, 'backend', '.env').trim();
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
  readOptionalUtf8(ROOT, 'frontend', '.env').trim() || '# (empty)',
  '',
  H.frontendLocal,
  readOptionalUtf8(ROOT, 'frontend', '.env.local').trim() || '# (empty)',
].join('\n');

writeUtf8(ROOT, '.env', body + '\n');
console.log('Combined → .env (' + env + ')');
