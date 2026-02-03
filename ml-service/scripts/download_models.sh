#!/bin/sh
# Download CNN and ViT model zips from GitHub Releases and extract to /app/models/.
# Env: GITHUB_REPO (default Alvaromp3/fashion_ai), RELEASE_TAG (default v1.0.0), GITHUB_TOKEN (optional).

set -e

GITHUB_REPO="${GITHUB_REPO:-Alvaromp3/fashion_ai}"
RELEASE_TAG="${RELEASE_TAG:-v1.0.0}"
BASE="https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}"
MODELS_DIR="/app/models"

mkdir -p "$MODELS_DIR"

auth_header=""
if [ -n "$GITHUB_TOKEN" ]; then
  auth_header="Authorization: token ${GITHUB_TOKEN}"
fi

echo "Downloading models from ${GITHUB_REPO} @ ${RELEASE_TAG}..."

# CNN: cnn_model_v1.zip -> /app/models/modelo_ropa.h5
TMP_CNN="/tmp/cnn_model_v1.zip"
if [ -n "$auth_header" ]; then
  curl -sL -H "$auth_header" -o "$TMP_CNN" "${BASE}/cnn_model_v1.zip"
else
  curl -sL -o "$TMP_CNN" "${BASE}/cnn_model_v1.zip"
fi
unzip -o -j "$TMP_CNN" -d "$MODELS_DIR"
rm -f "$TMP_CNN"
# Ensure final name (zip might have different internal name)
for f in "$MODELS_DIR"/*.h5; do
  [ -f "$f" ] && [ "$f" != "$MODELS_DIR/modelo_ropa.h5" ] && mv "$f" "$MODELS_DIR/modelo_ropa.h5" && break
done
[ -f "$MODELS_DIR/modelo_ropa.h5" ] || { echo "CNN model not found in zip"; exit 1; }
echo "CNN model -> $MODELS_DIR/modelo_ropa.h5"

# ViT: vit_model_v1.zip -> /app/models/vision_transformer_moda_modelo.keras
TMP_VIT="/tmp/vit_model_v1.zip"
if [ -n "$auth_header" ]; then
  curl -sL -H "$auth_header" -o "$TMP_VIT" "${BASE}/vit_model_v1.zip"
else
  curl -sL -o "$TMP_VIT" "${BASE}/vit_model_v1.zip"
fi
unzip -o -j "$TMP_VIT" -d "$MODELS_DIR"
rm -f "$TMP_VIT"
for f in "$MODELS_DIR"/*.keras; do
  [ -f "$f" ] && [ "$f" != "$MODELS_DIR/vision_transformer_moda_modelo.keras" ] && mv "$f" "$MODELS_DIR/vision_transformer_moda_modelo.keras" && break
done
[ -f "$MODELS_DIR/vision_transformer_moda_modelo.keras" ] || { echo "ViT model not found in zip"; exit 1; }
echo "ViT model -> $MODELS_DIR/vision_transformer_moda_modelo.keras"

echo "Models ready."
