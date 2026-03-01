#!/usr/bin/env bash
# Pull latest env from vault into backend/.env.
# First time: export DOTENV_KEY=your_key (get it from whoever set up the vault).
# Then run: ./scripts/env-vault-pull.sh   or   npm run env:vault-pull

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Avoid npm cache permission errors on some machines
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/tmp/npm-cache-vault-$$}"

if [ -z "$DOTENV_KEY" ]; then
  echo "DOTENV_KEY is not set."
  echo ""
  echo "First time (get the key from your team):"
  echo "  export DOTENV_KEY=vlt_xxxx..."
  echo "  ./scripts/env-vault-pull.sh"
  echo ""
  echo "Or from repo root:"
  echo "  export DOTENV_KEY=vlt_xxxx..."
  echo "  npm run env:vault-pull"
  exit 1
fi

echo "Pulling latest env from vault..."
(cd "$ROOT/backend" && npx dotenv-vault@latest pull)
echo "Done. backend/.env updated."
