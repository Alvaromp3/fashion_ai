#!/usr/bin/env node
/**
 * Push frontend env vars to Cloudflare Pages via Wrangler CLI.
 * Reads frontend/.env (or frontend/.env.production), keeps VITE_* keys, and runs:
 *   wrangler pages secret bulk <temp.json> --project-name <project>
 *
 * Run from repo root: npm run cloudflare:pages-env
 * Requires: npx wrangler login (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const PROJECT_NAME = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'fashion-ai';

const ENV_FILES = [
  path.join(FRONTEND_DIR, '.env.production'),
  path.join(FRONTEND_DIR, '.env'),
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key.startsWith('VITE_')) out[key] = value;
  }
  return out;
}

function main() {
  let vars = {};
  for (const p of ENV_FILES) {
    if (fs.existsSync(p)) {
      const parsed = parseEnvFile(p);
      vars = { ...vars, ...parsed };
    }
  }
  if (Object.keys(vars).length === 0) {
    console.error('No VITE_* variables found in frontend/.env or frontend/.env.production');
    console.error('Create frontend/.env with at least:');
    console.error('  VITE_API_BASE_URL=https://fashion-ai-backend-c6wd.onrender.com');
    console.error('  VITE_AUTH0_DOMAIN=...');
    console.error('  VITE_AUTH0_CLIENT_ID=...');
    console.error('  VITE_AUTH0_AUDIENCE=...');
    console.error('  VITE_AUTH0_CALLBACK_URL=https://your-pages-url.pages.dev');
    process.exit(1);
  }
  const tempPath = path.join(ROOT, '.pages-env-bulk.json');
  try {
    fs.writeFileSync(tempPath, JSON.stringify(vars, null, 0), 'utf8');
    console.log('Updating Cloudflare Pages env for project:', PROJECT_NAME);
    console.log('Keys:', Object.keys(vars).join(', '));
    execSync(
      `npx wrangler pages secret bulk "${tempPath}" --project-name "${PROJECT_NAME}"`,
      { stdio: 'inherit', shell: true, cwd: ROOT }
    );
    console.log('Done. Redeploy the frontend (e.g. npm run cloudflare:pages-deploy or push to Git) for vars to take effect.');
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

main();
