#!/bin/bash
# Arranca solo el backend en primer plano. Usa backend/.env.
# Para backend + frontend + ML: ./start-all.sh
# Para parar: ./stop-all.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

echo "Starting backend on http://localhost:4000 ..."
echo "Press Ctrl+C to stop."
exec node server.js
