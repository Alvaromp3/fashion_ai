#!/bin/sh
# Download ViT model (best_model_17_marzo.keras) from GitHub Release.
# Supports: (1) direct asset best_model_17_marzo.keras
#           (2) zip vit_model_v1.zip (first .keras → best_model_17_marzo.keras)
# Env: GITHUB_REPO (required), MODELS_RELEASE_TAG (default models-v1.0), GITHUB_TOKEN (for private repos).

set -e

GITHUB_REPO="${GITHUB_REPO:-}"
RELEASE_TAG="${MODELS_RELEASE_TAG:-models-v1.0}"
MODELS_DIR="/app/models"
BASE="https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}"
TMP="/tmp/model_dl"
mkdir -p "$MODELS_DIR" "$TMP"

if [ -z "$GITHUB_REPO" ]; then
  echo "Error: GITHUB_REPO not set. Set it in Space Settings or in the Dockerfile."
  exit 1
fi

auth_header=""
[ -n "$GITHUB_TOKEN" ] && auth_header="Authorization: token ${GITHUB_TOKEN}"
curl_() {
  if [ -n "$auth_header" ]; then curl -sL -H "$auth_header" "$@"; else curl -sL "$@"; fi
}

echo "Downloading ViT from ${GITHUB_REPO} @ ${RELEASE_TAG}..."

NAME="best_model_17_marzo.keras"
dest="$MODELS_DIR/$NAME"
code=$(curl_ -o "$dest" -w "%{http_code}" "${BASE}/${NAME}")
if [ "$code" = "200" ] && [ -s "$dest" ]; then
  echo "$NAME -> $dest (direct)"
  echo "Model ready."
  exit 0
fi
rm -f "$dest"

echo "Direct asset not found; trying vit_model_v1.zip..."
curl_ -o "$TMP/vit_model_v1.zip" "${BASE}/vit_model_v1.zip"
[ -s "$TMP/vit_model_v1.zip" ] || { echo "Failed to download vit_model_v1.zip"; exit 1; }
unzip -o -q "$TMP/vit_model_v1.zip" -d "$TMP"

f=""
for cand in "$TMP"/*.keras "$TMP"/*/*.keras; do
  if [ -f "$cand" ]; then
    f="$cand"
    break
  fi
done
[ -n "$f" ] || { echo "No .keras found in zip"; exit 1; }
cp "$f" "$dest"
echo "Model ready (from zip)."
rm -rf "$TMP"
