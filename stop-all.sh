#!/bin/bash

# Script para detener todos los servicios de Fashion AI (local y ML en Docker)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Stopping all Fashion AI services..."

# ML en Docker (si se usó start-all-docker.sh)
docker compose -f docker-compose.ml.yml down 2>/dev/null || true
docker stop fashion-ml 2>/dev/null || true
docker rm fashion-ml 2>/dev/null || true

# Procesos locales
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true

# Liberar puertos
lsof -ti:3000,5001,5002 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 1

if lsof -ti:3000,5001,5002 >/dev/null 2>&1; then
    echo "Warning: Some ports are still in use"
else
    echo "All services have been stopped"
fi
