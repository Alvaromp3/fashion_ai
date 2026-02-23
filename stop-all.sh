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
pkill -9 -f "node.*server.js" 2>/dev/null || true
pkill -9 -f "nodemon" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "python.*app.py" 2>/dev/null || true

# Liberar puertos (macOS: lsof por puerto)
for port in 3000 4000 6001; do
  pid=$(lsof -ti :$port 2>/dev/null)
  [ -n "$pid" ] && kill -9 $pid 2>/dev/null && echo "  Puerto $port liberado (PID $pid)"
done

sleep 2

still=
for port in 3000 4000 6001; do lsof -ti :$port >/dev/null 2>&1 && still=1; done
if [ -n "$still" ]; then
  echo "Warning: Some ports (3000, 4000, 6001) are still in use. Ejecuta: lsof -i :3000 -i :4000 -i :6001"
else
  echo "All services have been stopped"
fi
