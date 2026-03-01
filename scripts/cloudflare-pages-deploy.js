#!/usr/bin/env node
const { execSync } = require('child_process');
execSync('cd frontend && npm run build', { stdio: 'inherit', shell: true });
execSync('npx wrangler pages deploy frontend/dist --project-name fashion-ai', { stdio: 'inherit', shell: true });
