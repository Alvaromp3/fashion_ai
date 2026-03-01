#!/usr/bin/env bash
# Build frontend and deploy to Cloudflare Pages via Wrangler (Direct Upload).
# Run from repo root. First time: npx wrangler login
# Optional: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for CI.

set -e
PROJECT_NAME="fashion-ai"
BUILD_DIR="frontend/dist"

echo "Building frontend..."
(cd frontend && npm ci && npm run build)

if [ ! -d "$BUILD_DIR" ]; then
  echo "Build output not found: $BUILD_DIR"
  exit 1
fi

echo "Deploying to Cloudflare Pages (project: $PROJECT_NAME)..."
npx wrangler pages deploy "$BUILD_DIR" --project-name "$PROJECT_NAME" || {
  echo "If project does not exist, create it first: npx wrangler pages project create $PROJECT_NAME"
  exit 1
}
echo "Done. Set Pages env vars (VITE_*) in Dashboard -> Workers & Pages -> $PROJECT_NAME -> Settings -> Environment variables, then redeploy."
