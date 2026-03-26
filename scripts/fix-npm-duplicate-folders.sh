#!/usr/bin/env bash
# Fix duplicate folder names in node_modules (e.g. "dist 2" → "dist") after iCloud/copy glitches.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
for pkg in caniuse-lite framer-motion; do
  base="node_modules/$pkg"
  [ ! -d "$base" ] && continue
  for wrong in "dist 2" "data 2" "client 2"; do
    right="${wrong% 2}"
    if [ -d "$base/$wrong" ] && [ ! -d "$base/$right" ]; then
      mv "$base/$wrong" "$base/$right" && echo "Fixed $pkg: $wrong -> $right"
    fi
  done
done
