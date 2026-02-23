#!/bin/bash

# Script para detener todos los servicios de Fashion AI (local y ML en Docker)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Stopping all Fashion AI services..."

# Puertos del proyecto
PORTS=(3000 4000 6001)

# ML en Docker (si se usó start-all-docker.sh)
docker compose -f docker-compose.ml.yml down 2>/dev/null || true
docker stop fashion-ml 2>/dev/null || true
docker rm fashion-ml 2>/dev/null || true

# Procesos locales
pkill -9 -f "node.*server.js" 2>/dev/null || true
pkill -9 -f "nodemon" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "python.*app.py" 2>/dev/null || true

kill_port_force() {
  local port="$1"
  local pids=""
  pids="$(lsof -ti :$port 2>/dev/null | tr '\n' ' ' | xargs 2>/dev/null || true)"
  [ -z "$pids" ] && return 0
  echo "  Puerto $port ocupado. Matando PID(s): $pids"

  # Intento suave primero
  kill $pids 2>/dev/null || true
  sleep 0.6

  # Forzar si sigue ocupado
  if lsof -ti :$port >/dev/null 2>&1; then
    kill -9 $pids 2>/dev/null || true
    sleep 0.6
  fi
}

# Liberar puertos del proyecto (solo los necesarios)
for port in "${PORTS[@]}"; do
  kill_port_force "$port"
done

# Verificación final con reintentos
for attempt in 1 2 3 4 5; do
  busy=""
  for port in "${PORTS[@]}"; do
    if lsof -ti :$port >/dev/null 2>&1; then
      busy="$busy $port"
    fi
  done
  if [ -z "$busy" ]; then
    echo "All services have been stopped (ports free: ${PORTS[*]})"
    exit 0
  fi
  echo "Warning: Ports still in use:$busy (retry $attempt/5)"
  sleep 1
done

echo "Ports still in use after stop-all.sh. Inspect:"
echo "  lsof -nP -iTCP:3000 -sTCP:LISTEN"
echo "  lsof -nP -iTCP:4000 -sTCP:LISTEN"
echo "  lsof -nP -iTCP:6001 -sTCP:LISTEN"
exit 1
