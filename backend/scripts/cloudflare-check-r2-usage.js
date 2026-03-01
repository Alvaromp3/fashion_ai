#!/usr/bin/env node
/**
 * Check current R2 bucket storage via Cloudflare GraphQL Analytics API.
 * Exits with code 1 if usage exceeds R2_SOFT_LIMIT_BYTES (so cron/CI can alert).
 * Run from backend dir: node scripts/cloudflare-check-r2-usage.js
 * Requires: backend/.env with CLOUDFLARE_API_TOKEN, R2_ACCOUNT_ID, R2_BUCKET_NAME
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getR2StorageBytes } = require('../utils/cloudflareUsage');

const limitBytes = parseInt(process.env.R2_SOFT_LIMIT_BYTES, 10) || 9.5 * 1e9;

async function main() {
  const usage = await getR2StorageBytes();
  if (usage === null) {
    console.warn('Could not fetch R2 usage (missing CLOUDFLARE_API_TOKEN or R2_* env).');
    process.exit(0); // don't fail cron if token not set
    return;
  }
  const bytes = usage.payloadSize;
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  const limitMb = (limitBytes / (1024 * 1024)).toFixed(2);
  console.log(`R2 bucket ${process.env.R2_BUCKET_NAME}: ${mb} MB used (limit ${limitMb} MB), ${usage.objectCount} objects`);
  if (bytes > limitBytes) {
    console.error('Over limit. Reduce storage or increase R2_SOFT_LIMIT_BYTES.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
