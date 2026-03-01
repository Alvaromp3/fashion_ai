#!/usr/bin/env node
/**
 * Validate render-backend-only.yaml with the Render CLI.
 * Requires: Render CLI installed and in PATH (render login).
 * Run from repo root: npm run render:validate
 */
const { execSync } = require('child_process');
const path = require('path');

const blueprintPath = path.join(__dirname, '..', 'render-backend-only.yaml');
try {
  execSync(`render blueprints validate "${blueprintPath}"`, { stdio: 'inherit', shell: true });
} catch (e) {
  if (e.status === 127 || (e.message && e.message.includes('render'))) {
    console.error('Render CLI not found. Install: https://render.com/docs/cli');
  }
  process.exit(e.status || 1);
}
