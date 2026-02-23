#!/usr/bin/env bash
# Corrige carpetas mal nombradas (ej. "dist 2" -> "dist") en node_modules.
# Algunos entornos (iCloud, copias) pueden crear duplicados con " 2".
cd "$(dirname "$0")"
for pkg in caniuse-lite framer-motion; do
  base="node_modules/$pkg"
  [ ! -d "$base" ] && continue
  for wrong in "dist 2" "data 2" "client 2"; do
    right="${wrong% 2}"
    [ -d "$base/$wrong" ] && [ ! -d "$base/$right" ] && mv "$base/$wrong" "$base/$right" && echo "Fixed $pkg: $wrong -> $right"
  done
done
