#!/usr/bin/env bash
# Publish ML model files as a GitHub release so Docker (or others) can download them.
# Requires: gh CLI (brew install gh), and you must be logged in (gh auth login).
#
# Usage:
#   ./scripts/publish-models-release.sh [RELEASE_TAG]
#   RELEASE_TAG defaults to "models-v1.0". Example: ./scripts/publish-models-release.sh models-v1.0
#
# Model files must exist in ml-service/:
#   - modelo_ropa.h5 (CNN)
#   - vision_transformer_moda_modelo.keras (ViT)

set -e

RELEASE_TAG="${1:-models-v1.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ML_DIR="$REPO_ROOT/ml-service"

CNN_FILE="$ML_DIR/modelo_ropa.h5"
VIT_FILE="$ML_DIR/vision_transformer_moda_modelo.keras"

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Install it with: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

MISSING=""
[ ! -f "$CNN_FILE" ] && MISSING="$MISSING modelo_ropa.h5"
[ ! -f "$VIT_FILE" ] && MISSING="$MISSING vision_transformer_moda_modelo.keras"

if [ -n "$MISSING" ]; then
  echo "Error: Model file(s) not found in ml-service/:$MISSING"
  echo "Place the files in $ML_DIR and run this script again."
  exit 1
fi

cd "$REPO_ROOT"

# Create or replace release and upload assets
if gh release view "$RELEASE_TAG" &>/dev/null; then
  echo "Release $RELEASE_TAG already exists. Deleting to re-upload assets..."
  gh release delete "$RELEASE_TAG" --yes
fi

echo "Creating release $RELEASE_TAG and uploading model files..."
gh release create "$RELEASE_TAG" \
  "$CNN_FILE" \
  "$VIT_FILE" \
  --title "ML models ($RELEASE_TAG)" \
  --notes "Fashion classification models for Fashion AI.

- **modelo_ropa.h5**: CNN model (~87% accuracy).
- **vision_transformer_moda_modelo.keras**: Vision Transformer model (~94% accuracy).

Used by the ml-service Docker image. Download URLs:
\`\`\`
https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/download/$RELEASE_TAG/modelo_ropa.h5
https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/download/$RELEASE_TAG/vision_transformer_moda_modelo.keras
\`\`\`
"

echo "Done. Release: $(gh release view "$RELEASE_TAG" --json url -q .url)"
echo "Use MODELS_RELEASE_TAG=$RELEASE_TAG when building the Docker image."
