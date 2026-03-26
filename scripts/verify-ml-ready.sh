#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="$ROOT_DIR/ml-service/Dockerfile"
CONFIG_FILE="$ROOT_DIR/ml-service/src/fashion_ml/config.py"
APP_FILE="$ROOT_DIR/ml-service/app.py"

echo "Verificando ML deployment readiness..."
echo

if grep -n "GITHUB_REPO=Alvaromp3/fashion_ai" "$DOCKERFILE" >/dev/null; then
  echo "OK  Dockerfile sets default GITHUB_REPO"
else
  echo "FAIL Dockerfile missing GITHUB_REPO default"
  exit 1
fi

if grep -n "MODELS_RELEASE_TAG=models-v1.0" "$DOCKERFILE" >/dev/null; then
  echo "OK  Dockerfile sets default MODELS_RELEASE_TAG"
else
  echo "FAIL Dockerfile missing MODELS_RELEASE_TAG default"
  exit 1
fi

if grep -n "MODEL_ASSET_NAME=best_model_17_marzo.keras" "$DOCKERFILE" >/dev/null; then
  echo "OK  Dockerfile sets expected asset name"
else
  echo "FAIL Dockerfile missing MODEL_ASSET_NAME default"
  exit 1
fi

if grep -n "COPY models /app/models" "$DOCKERFILE" >/dev/null; then
  echo "WARN Dockerfile still copies local models directory (not required)"
else
  echo "OK  Dockerfile does not depend on local models copy"
fi

if grep -n "ML_VIT_PATH=/app/models/best_model_17_marzo.keras" "$DOCKERFILE" >/dev/null; then
  echo "OK  Dockerfile runtime path env aligned"
else
  echo "WARN Dockerfile ML_VIT_PATH not explicitly set to /app/models/best_model_17_marzo.keras"
fi

if grep -n "models/best_model_17_marzo.keras" "$CONFIG_FILE" >/dev/null; then
  echo "OK  Runtime resolver points to ml-service/models/best_model_17_marzo.keras"
else
  echo "FAIL Runtime resolver not aligned with best_model_17_marzo.keras"
  exit 1
fi

if grep -n "_ensure_vit_model_available" "$APP_FILE" >/dev/null; then
  echo "OK  app startup includes model download/acquisition step"
else
  echo "FAIL app startup missing model acquisition step"
  exit 1
fi

echo
echo "ML readiness checks passed."
