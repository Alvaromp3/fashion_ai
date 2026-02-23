#!/bin/bash
# Stop all, reinstall frontend deps (postcss), then start all. Usage: ./run.sh

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "1. Stopping all services..."
./stop-all.sh 2>/dev/null || true
pkill -f vite 2>/dev/null || true
for port in 3000 4000 6001; do lsof -ti :$port | xargs kill -9 2>/dev/null; done
sleep 2

echo "2. Frontend: install (postcss 8.4.49)..."
cd "$SCRIPT_DIR/frontend"
npm install postcss@8.4.49 --save-dev --legacy-peer-deps 2>/dev/null || true
cd "$SCRIPT_DIR"

echo "3. Starting all services..."
./start-all.sh
