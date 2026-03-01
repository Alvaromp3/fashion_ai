#!/usr/bin/env bash
# Upload ViT model to Hugging Face using Env Vault and Git LFS.
# Non-interactive. Requires: DOTENV_KEY set, HF_TOKEN in vault.
# Usage: export DOTENV_KEY=your_key && ./scripts/upload-vit-to-hf.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"
MODEL_SOURCE="$ROOT_DIR/ml-service/vision_transformer_moda_modelo.keras"
REPO_NAME="fashion-ai-vit-model"

echo "=============================================="
echo "STEP 1 — Env Vault / Hugging Face setup"
echo "=============================================="

if [ -z "$DOTENV_KEY" ]; then
  echo "ERROR: DOTENV_KEY is not set. Export it first:"
  echo "  export DOTENV_KEY=tu_dotenv_vault_key"
  exit 1
fi

if [ ! -f "$MODEL_SOURCE" ]; then
  echo "ERROR: Model file not found: $MODEL_SOURCE"
  echo "Run 'git lfs pull' in the repo root if needed."
  exit 1
fi

echo "Pulling latest environment from Env Vault..."
(cd "$ROOT_DIR/backend" && npx dotenv-vault@latest pull)
if [ ! -f "$BACKEND_ENV" ]; then
  echo "ERROR: backend/.env not found after pull."
  exit 1
fi

# Load HF_TOKEN from backend/.env (no export of other vars)
HF_TOKEN=""
if [ -f "$BACKEND_ENV" ]; then
  HF_TOKEN=$(grep -E '^HF_TOKEN=' "$BACKEND_ENV" | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' | tr -d '\r')
fi
if [ -z "$HF_TOKEN" ]; then
  echo "ERROR: HF_TOKEN not found in backend/.env. Add it to Env Vault and pull again."
  exit 1
fi

echo "STEP 2 — Hugging Face CLI"
echo "----------------------------------------------"
if ! command -v huggingface-cli &>/dev/null; then
  echo "Installing huggingface_hub and git-lfs..."
  pip install -U -q huggingface_hub
fi
if ! command -v git-lfs &>/dev/null; then
  echo "Installing git-lfs..."
  if command -v brew &>/dev/null; then
    brew install git-lfs && git lfs install
  else
    pip install -U -q git-lfs && git lfs install
  fi
fi

echo "STEP 3 — Authenticate Hugging Face"
echo "----------------------------------------------"
huggingface-cli login --token "$HF_TOKEN" --add-to-git-credential

echo "STEP 4 — Ensure model repo exists"
echo "----------------------------------------------"
huggingface-cli repo create "$REPO_NAME" --type model --exist-ok || true

HF_USER=$(huggingface-cli whoami 2>/dev/null | head -1 || echo "")
if [ -z "$HF_USER" ]; then
  echo "ERROR: Could not get Hugging Face username."
  exit 1
fi
REPO_URL="https://huggingface.co/${HF_USER}/${REPO_NAME}"
CLONE_URL="https://huggingface.co/${HF_USER}/${REPO_NAME}"

echo "STEP 5 — Clone repo and configure LFS"
echo "----------------------------------------------"
UPLOAD_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t hf-vit)
trap "rm -rf \"$UPLOAD_DIR\"" EXIT

git clone "$CLONE_URL" "$UPLOAD_DIR"
cd "$UPLOAD_DIR"
git lfs install
git lfs track "*.keras" 2>/dev/null || true
git add .gitattributes 2>/dev/null || true

echo "STEP 6 — Add updated model"
echo "----------------------------------------------"
cp "$MODEL_SOURCE" "./vision_transformer_moda_modelo.keras"
git add vision_transformer_moda_modelo.keras
git add .gitattributes 2>/dev/null || true
git status
git commit -m "Update ViT model via Env Vault synced environment" || true
git push

echo "STEP 7 — Verify"
echo "----------------------------------------------"
if huggingface-cli repo info "${HF_USER}/${REPO_NAME}" &>/dev/null; then
  echo "Repo info OK."
fi
echo ""
echo "=============================================="
echo "SUCCESS — ViT model uploaded to Hugging Face"
echo "=============================================="
echo "  Model repo: $REPO_URL"
echo "  File:       vision_transformer_moda_modelo.keras"
echo ""
echo "Production: set ML_SERVICE_URL or ML_VIT_SERVICE_URL to your HF Space or endpoint that serves this model, or ensure your ML Space uses this repo to load the ViT."
echo "=============================================="
