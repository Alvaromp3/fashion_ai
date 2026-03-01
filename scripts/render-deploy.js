#!/usr/bin/env node
/**
 * Trigger a deploy for fashion-ai-backend via Render CLI.
 * Requires: Render CLI installed and logged in (render login).
 * Optional: RENDER_SERVICE_ID=srv-xxxx (from render services -o json).
 * Run from repo root: npm run render:deploy
 */
const { execSync } = require('child_process');

const serviceId = process.env.RENDER_SERVICE_ID;
const args = ['deploys', 'create'];
if (serviceId) args.push(serviceId);
args.push('--wait', '--output', 'text', '--confirm');

try {
  execSync(`render ${args.join(' ')}`, { stdio: 'inherit', shell: true });
} catch (e) {
  if (e.status === 127 || (e.message && e.message.includes('render'))) {
    console.error('Render CLI not found. Install: https://render.com/docs/cli');
  }
  if (!serviceId) {
    console.error('Tip: set RENDER_SERVICE_ID to your backend service ID (render services -o json).');
  }
  process.exit(e.status || 1);
}
