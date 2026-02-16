#!/usr/bin/env bash
# Publish model files from release_assets/ as a GitHub release.
# Requires: gh CLI (brew install gh), and you must be logged in (gh auth login).
#
# Usage:
#   ./scripts/publish-release-assets.sh [RELEASE_TAG]
#   RELEASE_TAG defaults to "models-v1.0". Example: ./scripts/publish-release-assets.sh models-v1.0

set -e

RELEASE_TAG="${1:-models-v1.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASE_ASSETS_DIR="$REPO_ROOT/release_assets"

CNN_FILE="$RELEASE_ASSETS_DIR/cnn_model_v1.zip"
VIT_FILE="$RELEASE_ASSETS_DIR/vit_model_v1.zip"

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Install it with: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

MISSING=""
[ ! -f "$CNN_FILE" ] && MISSING="$MISSING cnn_model_v1.zip"
[ ! -f "$VIT_FILE" ] && MISSING="$MISSING vit_model_v1.zip"

if [ -n "$MISSING" ]; then
  echo "Error: Model file(s) not found in release_assets/:$MISSING"
  echo "Place the files in $RELEASE_ASSETS_DIR and run this script again."
  exit 1
fi

cd "$REPO_ROOT"

# Get repo name for URLs
REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)

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

- **cnn_model_v1.zip**: CNN model archive.
- **vit_model_v1.zip**: Vision Transformer model archive.

Used by the ml-service Docker image. Download URLs:
\`\`\`
https://github.com/$REPO_NAME/releases/download/$RELEASE_TAG/cnn_model_v1.zip
https://github.com/$REPO_NAME/releases/download/$RELEASE_TAG/vit_model_v1.zip
\`\`\`
"

echo "Done. Release: $(gh release view "$RELEASE_TAG" --json url -q .url)"
echo "Use MODELS_RELEASE_TAG=$RELEASE_TAG when building the Docker image."
