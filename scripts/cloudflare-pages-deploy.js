#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
execSync('npm run build', { stdio: 'inherit', shell: true, cwd: path.join(root, 'frontend') });
execSync('npx wrangler pages deploy frontend/dist --project-name fashion-ai', { stdio: 'inherit', shell: true, cwd: root });
