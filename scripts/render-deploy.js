#!/usr/bin/env node
/**
 * Trigger a deploy for fashion-ai-backend.
 *
 * Preferred: Render CLI (if installed).
 * Fallback: Render API (requires RENDER_API_KEY + RENDER_SERVICE_ID).
 *
 * Run from repo root: npm run render:deploy
 */
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadCredsFromEnvFiles() {
  const root = path.resolve(__dirname, '..');
  const envFiles = [path.join(root, 'backend', '.env'), path.join(root, '.env')];
  for (const filePath of envFiles) {
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim().toUpperCase();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key === 'RENDER_API_KEY' && !process.env.RENDER_API_KEY) process.env.RENDER_API_KEY = value;
      if (key === 'RENDER_SERVICE_ID' && !process.env.RENDER_SERVICE_ID) process.env.RENDER_SERVICE_ID = value;
    }
  }
}

function tryCliDeploy(serviceId) {
  const args = ['deploys', 'create'];
  if (serviceId) args.push(serviceId);
  args.push('--wait', '--output', 'text', '--confirm');
  execSync(`render ${args.join(' ')}`, { stdio: 'inherit', shell: true });
}

function requestJson(method, urlPath, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = https.request(
      {
        hostname: 'api.render.com',
        path: `/v1${urlPath}`,
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (ch) => (out += ch));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = out ? JSON.parse(out) : null;
          } catch {
            // ignore
          }
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
          const msg = parsed?.message || parsed?.error || out || `HTTP ${res.statusCode}`;
          reject(new Error(msg));
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function apiDeploy(serviceId, apiKey) {
  // Render API: POST /v1/services/{serviceId}/deploys
  const res = await requestJson('POST', `/services/${serviceId}/deploys`, {}, apiKey);
  const deployId = res?.id || res?.deploy?.id;
  console.log('Deploy triggered via Render API.', deployId ? `Deploy ID: ${deployId}` : '');
}

async function main() {
  loadCredsFromEnvFiles();
  const serviceId = process.env.RENDER_SERVICE_ID?.trim();
  const apiKey = process.env.RENDER_API_KEY?.trim();

  // 1) Try CLI if available
  try {
    tryCliDeploy(serviceId);
    return;
  } catch (e) {
    const msg = e?.message || '';
    const isCliMissing = e?.status === 127 || msg.includes('render: command not found') || msg.includes('not found');
    if (!isCliMissing) {
      // CLI exists but failed for another reason; show error and continue to API fallback if possible
      console.warn('Render CLI deploy failed; trying API fallback...');
    } else {
      console.warn('Render CLI not found; using Render API fallback...');
    }
  }

  // 2) API fallback
  if (!serviceId) {
    console.error('RENDER_SERVICE_ID is required for API deploy fallback.');
    process.exit(1);
  }
  if (!apiKey) {
    console.error('RENDER_API_KEY is required for API deploy fallback.');
    process.exit(1);
  }
  await apiDeploy(serviceId, apiKey);
}

main().catch((e) => {
  console.error('Failed to trigger Render deploy:', e.message || e);
  process.exit(1);
});
