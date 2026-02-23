#!/bin/bash
# Arranca solo el frontend (Vite) en primer plano. Útil para probar "connection refused".
# Para ver la app completa (backend + ML + frontend) usa ./start-all.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/frontend"

echo "Starting frontend on http://localhost:3000 ..."
echo "Press Ctrl+C to stop."
exec npm run dev
