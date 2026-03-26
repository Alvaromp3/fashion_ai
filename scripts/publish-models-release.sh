#!/usr/bin/env bash
# Publish the ViT model as a GitHub release asset so Docker (or others) can download it.
# Requires: gh CLI (brew install gh), and you must be logged in (gh auth login).
#
# Usage:
#   ./scripts/publish-models-release.sh [RELEASE_TAG]
#   RELEASE_TAG defaults to "models-v1.0". Example: ./scripts/publish-models-release.sh models-v1.0
#
# Model file must exist at:
#   ml-service/models/best_model_17_marzo.keras

set -e

RELEASE_TAG="${1:-models-v1.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ML_DIR="$REPO_ROOT/ml-service"

VIT_FILE="$ML_DIR/models/best_model_17_marzo.keras"

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Install it with: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

if [ ! -f "$VIT_FILE" ]; then
  echo "Error: Model not found: $VIT_FILE"
  echo "Place best_model_17_marzo.keras in ml-service/models/ and run this script again."
  exit 1
fi

cd "$REPO_ROOT"

# Create or replace release and upload assets
if gh release view "$RELEASE_TAG" &>/dev/null; then
  echo "Release $RELEASE_TAG already exists. Deleting to re-upload assets..."
  gh release delete "$RELEASE_TAG" --yes
fi

echo "Creating release $RELEASE_TAG and uploading model..."
OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
gh release create "$RELEASE_TAG" \
  "$VIT_FILE" \
  --title "ML model ($RELEASE_TAG)" \
  --notes "Fashion classification — Vision Transformer (ViT) only.

- **best_model_17_marzo.keras**: ViT classifier (10 classes).

Used by the ml-service and HF Space Dockerfiles. Download URL:
\`\`\`
https://github.com/${OWNER_REPO}/releases/download/${RELEASE_TAG}/best_model_17_marzo.keras
\`\`\`

Optional zip name for legacy scripts: **vit_model_v1.zip** (must contain a \`.keras\` file).
"

echo "Done. Release: $(gh release view "$RELEASE_TAG" --json url -q .url)"
echo "Use MODELS_RELEASE_TAG=$RELEASE_TAG when building the Docker image."
