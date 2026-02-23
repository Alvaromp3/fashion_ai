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

# Liberar puertos (Frontend 3000, Backend 4000, ML 6001)
for port in 3000 4000 6001; do
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

# Backend (nohup para que no muera al cerrar la terminal)
echo -e "${BLUE}Starting Backend (4000)...${NC}"
cd "$SCRIPT_DIR/backend"
nohup node server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 </dev/null &
BACKEND_PID=$!
disown 2>/dev/null || true
sleep 2
# ML Service (rutas absolutas de modelos para CNN y ViT)
echo -e "${BLUE}Starting ML Service (6001)...${NC}"
cd "$SCRIPT_DIR/ml-service"
export ML_CNN_PATH="${ML_CNN_PATH:-$SCRIPT_DIR/ml-service/modelo_ropa.h5}"
export ML_VIT_PATH="${ML_VIT_PATH:-$SCRIPT_DIR/ml-service/vision_transformer_moda_modelo.keras}"
ML_PID=""
if [ -x venv/bin/python ]; then
  nohup env ML_CNN_PATH="$ML_CNN_PATH" ML_VIT_PATH="$ML_VIT_PATH" venv/bin/python app.py >> "$SCRIPT_DIR/logs/ml-service.log" 2>&1 </dev/null &
  ML_PID=$!
  disown 2>/dev/null || true
  echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
  echo -e "${GREEN}ML Service started (PID: $ML_PID). Wait ~1–2 min for models to load.${NC}"
else
  echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
  echo -e "${YELLOW}ML Service not started: no venv in ml-service. Create one: cd ml-service && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
  echo -e "${YELLOW}Then run ./start-all.sh again, or start ML manually: ./ml-service/run_ml.sh${NC}"
fi

# No bloquear: el ML tarda en cargar (TensorFlow + modelos). Curl con timeout para no colgar.
(sleep 15; if command -v curl >/dev/null 2>&1; then
  HEALTH=$(curl -s --connect-timeout 3 --max-time 5 http://localhost:6001/health 2>/dev/null)
  if echo "$HEALTH" | grep -q '"vit_model_loaded":true'; then
    echo -e "${GREEN}  ✓ CNN y ViT cargados correctamente${NC}"
  elif echo "$HEALTH" | grep -q '"model_loaded":true'; then
    echo -e "${YELLOW}  ⚠ ViT no cargó. Solo CNN disponible. Revisa logs/ml-service.log${NC}"
  fi
fi) &

# Frontend: corregir carpetas mal nombradas en node_modules (p. ej. "dist 2" -> "dist") y arrancar
echo -e "${BLUE}Starting Frontend (dev, port 3000)...${NC}"
[ -x "$SCRIPT_DIR/frontend/fix-npm-folders.sh" ] && "$SCRIPT_DIR/frontend/fix-npm-folders.sh" 2>/dev/null || true
: > "$SCRIPT_DIR/logs/frontend.log"
(cd "$SCRIPT_DIR/frontend" && node node_modules/vite/bin/vite.js --port 3000 --host 0.0.0.0 >> "$SCRIPT_DIR/logs/frontend.log" 2>&1) &
FRONTEND_PID=$!
sleep 15
if lsof -i :3000 >/dev/null 2>&1; then
  echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID). Abre http://localhost:3000${NC}"
else
  echo -e "${YELLOW}Frontend did not bind to 3000. Last 20 lines of logs/frontend.log:${NC}"
  tail -20 "$SCRIPT_DIR/logs/frontend.log" 2>/dev/null || true
  echo -e "${YELLOW}Run manually: cd frontend && npm run dev (keep that terminal open)${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}All services are running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Backend:    http://localhost:4000"
echo -e "  ML:        http://localhost:6001"
echo -e "  Frontend:  http://localhost:3000"
echo ""
echo -e "${YELLOW}  Abre http://localhost:3000 en el navegador.${NC}"
echo -e "${YELLOW}  Ctrl+C para parar todos los servicios.${NC}"
echo ""

# Esperar a que el usuario presione Ctrl+C
wait

