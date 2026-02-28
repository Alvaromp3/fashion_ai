#!/usr/bin/env bash
# Arranca Vite en modo dev (puerto 3000). Uso: desde raíz del proyecto o desde frontend.
cd "$(dirname "$0")"
# Solo corregir carpetas npm si se pide (evita ralentizar arranque)
[ "${FIX_NPM_FOLDERS:-0}" = "1" ] && [ -x ./fix-npm-folders.sh ] && ./fix-npm-folders.sh
exec npm run dev
