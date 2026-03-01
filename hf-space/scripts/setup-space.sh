#!/usr/bin/env bash
# Run from repo root: ./hf-space/scripts/setup-space.sh
# Prereqs: gh auth login, huggingface-cli login (https://huggingface.co/settings/tokens)

set -e
REPO="${GITHUB_REPO:-Alvaromp3/fashion_ai}"
TAG="${MODELS_RELEASE_TAG:-models-v1.0}"
HF_SPACE_ID="${HF_SPACE_ID:-fashion-ai-ml}"   # will be under your HF username, e.g. YOUR_USER/fashion-ai-ml
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HF_SPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 1. GitHub: check release and assets ==="
gh release view "$TAG" --repo "$REPO" || { echo "Release $TAG not found. Create it and upload cnn_model_v1.zip + vit_model_v1.zip (or modelo_ropa.h5 + vision_transformer_moda_modelo.keras)."; exit 1; }
echo "Release $TAG exists."
echo ""

echo "=== 2. Hugging Face: create Space (docker) ==="
huggingface-cli repo create "$HF_SPACE_ID" --repo-type space --space_sdk docker --exist-ok
echo ""

echo "=== 3. Upload hf-space files to the Space ==="
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/app.py" "app.py" --repo-type space
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/space_app.py" "space_app.py" --repo-type space
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/requirements.txt" "requirements.txt" --repo-type space
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/Dockerfile" "Dockerfile" --repo-type space
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/README.md" "README.md" --repo-type space
huggingface-cli upload "$HF_SPACE_ID" "$HF_SPACE_DIR/scripts/download_models.sh" "scripts/download_models.sh" --repo-type space
echo ""

echo "=== Done ==="
echo "Space URL: https://huggingface.co/spaces/$(huggingface-cli whoami 2>/dev/null || echo 'YOUR_USER')/$HF_SPACE_ID"
echo "Set your backend ML_SERVICE_URL to that URL (no trailing slash)."
echo "First build may take 10–15 min. The Dockerfile uses GITHUB_REPO=$REPO and MODELS_RELEASE_TAG=$TAG."
