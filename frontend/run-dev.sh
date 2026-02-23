#!/usr/bin/env bash
# Arranca Vite en modo dev (puerto 3000). Uso: desde raíz del proyecto o desde frontend.
cd "$(dirname "$0")"
[ -x ./fix-npm-folders.sh ] && ./fix-npm-folders.sh
# Usar npm run dev para no depender de la ruta exacta de vite y que siempre sea puerto 3000
exec npm run dev
