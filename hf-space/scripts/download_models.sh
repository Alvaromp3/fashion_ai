#!/bin/sh
# Download CNN and ViT models from GitHub Release.
# Supports: (1) direct assets modelo_ropa.h5, vision_transformer_moda_modelo.keras
#           (2) zips cnn_model_v1.zip, vit_model_v1.zip (extracts .h5 and .keras)
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

echo "Downloading models from ${GITHUB_REPO} @ ${RELEASE_TAG}..."

# Try direct .h5 and .keras assets first
try_direct() {
  for name in modelo_ropa.h5 vision_transformer_moda_modelo.keras; do
    dest="$MODELS_DIR/$name"
    if [ ! -s "$dest" ]; then
      code=$(curl_ -o "$dest" -w "%{http_code}" "${BASE}/${name}")
      if [ "$code" = "200" ] && [ -s "$dest" ]; then
        echo "$name -> $dest (direct)"
      else
        rm -f "$dest"
        return 1
      fi
    fi
  done
  return 0
}

if try_direct; then
  echo "Models ready (direct assets)."
  exit 0
fi

# Fallback: download zips and extract
echo "Direct assets not found; trying cnn_model_v1.zip and vit_model_v1.zip..."
for zip in cnn_model_v1.zip vit_model_v1.zip; do
  curl_ -o "$TMP/$zip" "${BASE}/${zip}"
  [ -s "$TMP/$zip" ] || { echo "Failed to download $zip"; exit 1; }
  unzip -o -q "$TMP/$zip" -d "$TMP"
done

# Copy extracted files to /app/models with expected names
for f in "$TMP"/*.h5 "$TMP"/*/*.h5 2>/dev/null; do
  [ -f "$f" ] && cp "$f" "$MODELS_DIR/modelo_ropa.h5" && echo "modelo_ropa.h5 <- $f" && break
done
for f in "$TMP"/*.keras "$TMP"/*/*.keras 2>/dev/null; do
  [ -f "$f" ] && cp "$f" "$MODELS_DIR/vision_transformer_moda_modelo.keras" && echo "vision_transformer_moda_modelo.keras <- $f" && break
done

[ -s "$MODELS_DIR/modelo_ropa.h5" ] || { echo "No .h5 found in zips"; exit 1; }
[ -s "$MODELS_DIR/vision_transformer_moda_modelo.keras" ] || { echo "No .keras found in zips"; exit 1; }
echo "Models ready (from zips)."
rm -rf "$TMP"
