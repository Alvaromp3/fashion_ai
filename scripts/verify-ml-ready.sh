#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_REL="ml-service/models/best_model_17_marzo.keras"
MODEL_PATH="$ROOT_DIR/$MODEL_REL"
DOCKERFILE="$ROOT_DIR/ml-service/Dockerfile"
CONFIG_FILE="$ROOT_DIR/ml-service/src/fashion_ml/config.py"

echo "Verificando ML deployment readiness..."
echo

if [ -f "$MODEL_PATH" ]; then
  echo "OK  model file exists: $MODEL_REL"
else
  echo "FAIL missing model file: $MODEL_REL"
  exit 1
fi

if grep -n "COPY models /app/models" "$DOCKERFILE" >/dev/null; then
  echo "OK  Dockerfile copies models directory"
else
  echo "FAIL Dockerfile missing: COPY models /app/models"
  exit 1
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

echo
echo "ML readiness checks passed."
