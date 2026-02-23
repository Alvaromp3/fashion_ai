#!/bin/sh
# Download CNN and ViT models from GitHub Release (assets: modelo_ropa.h5, vision_transformer_moda_modelo.keras).
# Publish first: ./scripts/publish-models-release.sh models-v1.0
# Env: GITHUB_REPO, MODELS_RELEASE_TAG (default models-v1.0), GITHUB_TOKEN (optional, for private repos).

set -e

GITHUB_REPO="${GITHUB_REPO:-}"
RELEASE_TAG="${MODELS_RELEASE_TAG:-$RELEASE_TAG}"
RELEASE_TAG="${RELEASE_TAG:-models-v1.0}"
MODELS_DIR="/app/models"
BASE="https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}"

mkdir -p "$MODELS_DIR"

if [ -z "$GITHUB_REPO" ]; then
  echo "Error: GITHUB_REPO not set. Set it to your repo (e.g. owner/fashion_ai)."
  exit 1
fi

auth_header=""
[ -n "$GITHUB_TOKEN" ] && auth_header="Authorization: token ${GITHUB_TOKEN}"

echo "Downloading models from ${GITHUB_REPO} @ ${RELEASE_TAG}..."

for name in modelo_ropa.h5 vision_transformer_moda_modelo.keras; do
  dest="$MODELS_DIR/$name"
  if [ -n "$auth_header" ]; then
    curl -sL -H "$auth_header" -o "$dest" "${BASE}/${name}"
  else
    curl -sL -o "$dest" "${BASE}/${name}"
  fi
  [ -f "$dest" ] && [ -s "$dest" ] || { echo "Failed to download $name"; exit 1; }
  echo "$name -> $dest"
done

echo "Models ready."
