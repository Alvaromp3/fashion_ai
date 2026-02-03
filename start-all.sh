#!/bin/bash

# Script para iniciar todos los servicios de Fashion AI

echo "Starting Fashion AI - All services..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para matar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    pkill -f "node.*server.js" 2>/dev/null
    pkill -f "nodemon" 2>/dev/null
    pkill -f "serve.cjs" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "python.*app.py" 2>/dev/null
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
mkdir -p "$SCRIPT_DIR/logs"

# Liberar puertos para evitar "port in use" (Vite usa 3000 estricto)
for port in 3000 5001 5002; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo -e "${YELLOW}  Puerto $port liberado (PID $pid)${NC}"
  fi
done
sleep 1

# Dependencias ML: por defecto no se ejecuta pip (arranque rápido). Para instalar/actualizar: INSTALL_ML_DEPS=1 ./start-all.sh
echo -e "${BLUE}ML service...${NC}"
cd "$SCRIPT_DIR/ml-service"
if [ -d venv ] && [ "${INSTALL_ML_DEPS:-0}" = "1" ]; then
  source venv/bin/activate
  echo -e "${YELLOW}  Instalando dependencias (pip puede tardar 1-2 min)...${NC}"
  if ! pip install -r requirements.txt; then
    pip install -r requirements-base.txt || true
  fi
  pip install keras-hub || true
  deactivate 2>/dev/null || true
  echo -e "${GREEN}  ML deps OK${NC}"
else
  [ -d venv ] && echo -e "${GREEN}  Usando venv existente${NC}" || echo -e "${YELLOW}  Sin venv (crea uno en ml-service y ejecuta INSTALL_ML_DEPS=1 ./start-all.sh la primera vez)${NC}"
fi

# Backend y ML en paralelo
echo -e "${BLUE}Starting Backend (5002) and ML Service (5001)...${NC}"
cd "$SCRIPT_DIR/backend"
npm run dev >> "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR/ml-service"
[ -x venv/bin/python ] && venv/bin/python app.py >> "$SCRIPT_DIR/logs/ml-service.log" 2>&1 &
ML_PID=$!
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}ML Service started (PID: $ML_PID)${NC}"

# No bloquear: el ML tarda en cargar (TensorFlow + modelos). Curl con timeout para no colgar.
(sleep 15; if command -v curl >/dev/null 2>&1; then
  HEALTH=$(curl -s --connect-timeout 3 --max-time 5 http://localhost:5001/health 2>/dev/null)
  if echo "$HEALTH" | grep -q '"vit_model_loaded":true'; then
    echo -e "${GREEN}  ✓ CNN y ViT cargados correctamente${NC}"
  elif echo "$HEALTH" | grep -q '"model_loaded":true'; then
    echo -e "${YELLOW}  ⚠ ViT no cargó. Solo CNN disponible. Revisa logs/ml-service.log${NC}"
  fi
fi) &

# Frontend en modo dev (rápido; sin build). Para producción: BUILD=1 ./start-all.sh
echo -e "${BLUE}Starting Frontend (dev, port 3000)...${NC}"
cd "$SCRIPT_DIR/frontend"
if [ "${BUILD:-0}" = "1" ]; then
  if ! npm run build >> "$SCRIPT_DIR/logs/frontend-build.log" 2>&1; then
    echo -e "${YELLOW}Build falló. Arrancando en modo dev.${NC}"
    npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
  else
    node serve.cjs >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
  fi
else
  npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
fi
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID). Abre http://localhost:3000 en ~5 s${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}All services are running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Backend:    http://localhost:5002"
echo -e "  ML:        http://localhost:5001"
echo -e "  Frontend:  http://localhost:3000"
echo ""
echo -e "${YELLOW}  Abre http://localhost:3000 en el navegador.${NC}"
echo -e "${YELLOW}  Ctrl+C para parar todos los servicios.${NC}"
echo ""

# Esperar a que el usuario presione Ctrl+C
wait

