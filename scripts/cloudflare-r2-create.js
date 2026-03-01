#!/usr/bin/env node
try {
  require('child_process').execSync('npx wrangler r2 bucket create fashion-ai-uploads', { stdio: 'inherit', shell: true });
} catch (e) {
  if (e.status === 1 && (e.stderr || '').toString().includes('already exists')) {
    console.log('Bucket fashion-ai-uploads already exists.');
    process.exit(0);
  }
  throw e;
}
