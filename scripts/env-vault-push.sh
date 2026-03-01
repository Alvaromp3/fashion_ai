#!/usr/bin/env bash
# Push backend/.env to the vault (only vault owner can push).
# From repo root: npm run env:vault-push   or   ./scripts/env-vault-push.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/tmp/npm-cache-vault-$$}"
cd "$ROOT"
echo "Pushing backend/.env to vault..."
(cd "$ROOT/backend" && npx dotenv-vault@latest push)
echo "Done. Team can run npm run env:vault-pull to get the latest."
