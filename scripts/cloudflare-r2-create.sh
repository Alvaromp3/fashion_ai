#!/usr/bin/env bash
# Create the Fashion AI R2 bucket using Wrangler (Cloudflare CLI).
# Run from repo root. First time: npx wrangler login
# R2 API tokens (for backend S3 access) must be created in Cloudflare Dashboard.

set -e
BUCKET="fashion-ai-uploads"
echo "Creating R2 bucket: $BUCKET"
npx wrangler r2 bucket create "$BUCKET" || { echo "Failed. Run: npx wrangler login"; exit 1; }
echo ""
echo "Bucket created. Next steps:"
echo "1. Dashboard -> R2 -> Manage R2 API Tokens -> Create API token"
echo "   Name: fashion-ai, Permission: Object Read & Write, Bucket: $BUCKET"
echo "2. Copy Access Key ID and Secret Access Key into backend env (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)"
echo "3. Bucket -> Settings -> enable Public access if you need public image URLs; set R2_PUBLIC_URL in backend"
