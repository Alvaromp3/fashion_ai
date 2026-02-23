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

# Asegurar que todo está parado y puertos libres
if [ -x "$SCRIPT_DIR/stop-all.sh" ]; then
  "$SCRIPT_DIR/stop-all.sh" >/dev/null 2>&1 || true
fi

PORTS=(3000 4000 6001)
for port in "${PORTS[@]}"; do
  pid=$(lsof -ti :$port 2>/dev/null | tr '\n' ' ' | xargs 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    echo -e "${YELLOW}  Puerto $port liberado (PID(s): $pid)${NC}"
  fi
done
# Esperar a que el SO libere los puertos antes de arrancar nada
sleep 2
# Verificar que los 3 puertos están libres (reintentos por si el SO tarda)
for attempt in 1 2 3 4 5; do
  busy=""
  for port in "${PORTS[@]}"; do
    if lsof -ti :$port >/dev/null 2>&1; then busy="$busy $port"; fi
  done
  if [ -z "$busy" ]; then break; fi
  echo -e "${YELLOW}  Esperando puertos libres:$busy (intento $attempt/5)...${NC}"
  sleep 2
  for port in "${PORTS[@]}"; do
    pid=$(lsof -ti :$port 2>/dev/null); [ -n "$pid" ] && kill -9 $pid 2>/dev/null || true
  done
done

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
: > "$SCRIPT_DIR/logs/backend.log"
nohup node server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 </dev/null &
BACKEND_PID=$!
disown 2>/dev/null || true
sleep 1

# Frontend: arrancar pronto para que Vite tenga tiempo (arranca en paralelo con ML)
echo -e "${BLUE}Starting Frontend (3000)...${NC}"
if [ ! -f "$SCRIPT_DIR/frontend/node_modules/vite/package.json" ]; then
  echo -e "${YELLOW}  Instalando dependencias del frontend (npm install)...${NC}"
  (cd "$SCRIPT_DIR/frontend" && npm install --legacy-peer-deps 2>&1) | tail -5
  echo -e "${GREEN}  Frontend deps OK${NC}"
fi
if lsof -ti :3000 >/dev/null 2>&1; then
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi
: > "$SCRIPT_DIR/logs/frontend.log"
chmod +x "$SCRIPT_DIR/frontend/run-dev.sh" 2>/dev/null || true
nohup "$SCRIPT_DIR/frontend/run-dev.sh" >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 </dev/null &
FRONTEND_PID=$!
disown 2>/dev/null || true

# ML Service (rutas absolutas de modelos para CNN y ViT)
echo -e "${BLUE}Starting ML Service (6001)...${NC}"
cd "$SCRIPT_DIR/ml-service"
export ML_CNN_PATH="${ML_CNN_PATH:-$SCRIPT_DIR/ml-service/modelo_ropa.h5}"
export ML_VIT_PATH="${ML_VIT_PATH:-$SCRIPT_DIR/ml-service/vision_transformer_moda_modelo.keras}"
ML_PID=""
if [ -x venv/bin/python ]; then
  : > "$SCRIPT_DIR/logs/ml-service.log"
  nohup env ML_CNN_PATH="$ML_CNN_PATH" ML_VIT_PATH="$ML_VIT_PATH" venv/bin/python app.py >> "$SCRIPT_DIR/logs/ml-service.log" 2>&1 </dev/null &
  ML_PID=$!
  disown 2>/dev/null || true
  echo -e "${GREEN}Backend (PID: $BACKEND_PID) | Frontend (PID: $FRONTEND_PID) | ML (PID: $ML_PID) started.${NC}"
else
  echo -e "${GREEN}Backend (PID: $BACKEND_PID) | Frontend (PID: $FRONTEND_PID) started.${NC}"
  echo -e "${YELLOW}ML not started: no venv in ml-service. Create: cd ml-service && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
fi

# Dar tiempo a Vite a levantar (evita esperas largas en el health check)
echo -e "${BLUE}Waiting for services (Vite ~10s)...${NC}"
sleep 10

# Checks con reintentos
echo -e "${BLUE}Health check...${NC}"

wait_http() {
  local name="$1"
  local url="$2"
  local expect="$3"
  local tries="$4"
  local delay="$5"
  local code=""
  for i in $(seq 1 "$tries"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 4 "$url" 2>/dev/null || echo "000")
    if [ "$code" = "$expect" ]; then
      echo -e "${GREEN}  ✓ $name OK ($code)${NC}"
      return 0
    fi
    sleep "$delay"
  done
  echo -e "${YELLOW}  ✗ $name FAIL (last HTTP $code)${NC}"
  return 1
}

# Usar 127.0.0.1 para forzar IPv4 (en macOS localhost puede ser IPv6 y fallar el health check)
OK=1
wait_http "Backend"  "http://127.0.0.1:4000/api/health" "200" 25 1 || OK=0
wait_http "ML"       "http://127.0.0.1:6001/health"     "200" 60 1 || OK=0
wait_http "Frontend" "http://127.0.0.1:3000/"           "200" 60 1 || OK=0

if [ "$OK" = "1" ]; then
  HEALTH=$(curl -s -4 --connect-timeout 2 --max-time 4 http://127.0.0.1:6001/health 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"vit_model_loaded":true'; then
    echo -e "${GREEN}  ✓ CNN y ViT cargados correctamente${NC}"
  elif echo "$HEALTH" | grep -q '"model_loaded":true'; then
    echo -e "${YELLOW}  ⚠ ML OK pero ViT aún no está listo (suele tardar 1–2 min).${NC}"
  fi
else
  echo -e "${YELLOW}Some services did not start correctly.${NC}"
  echo -e "${YELLOW}Logs (inicio del frontend por si falla al arrancar):${NC}"
  echo -e "${YELLOW}--- frontend.log (primeras 40 líneas) ---${NC}"
  head -40 "$SCRIPT_DIR/logs/frontend.log" 2>/dev/null || true
  echo -e "${YELLOW}--- frontend.log (últimas 20) ---${NC}"
  tail -20 "$SCRIPT_DIR/logs/frontend.log" 2>/dev/null || true
  echo -e "${YELLOW}--- backend.log (últimas 15) ---${NC}"
  tail -15 "$SCRIPT_DIR/logs/backend.log" 2>/dev/null || true
  echo -e "${YELLOW}--- ml-service.log (últimas 15) ---${NC}"
  tail -15 "$SCRIPT_DIR/logs/ml-service.log" 2>/dev/null || true
  echo -e "${YELLOW}Comprobar: ./check-ports.sh  |  Frontend manual: cd frontend && npm run dev${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
if [ "$OK" = "1" ]; then
  echo -e "${GREEN}All services are running!${NC}"
else
  echo -e "${YELLOW}Services started with errors. See logs above.${NC}"
fi
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Backend:    http://localhost:4000"
echo -e "  ML:        http://localhost:6001"
echo -e "  Frontend:  http://localhost:3000"
echo ""
echo -e "${YELLOW}  Abre http://localhost:3000 en el navegador.${NC}"
echo ""
echo -e "${BLUE}  CÓMO CERRAR TODO:${NC}"
echo -e "  · En esta terminal: ${GREEN}Ctrl+C${NC} (para backend, ML y frontend)."
echo -e "  · O en otra terminal: ${GREEN}./stop-all.sh${NC} (cierra todo y libera puertos)."
echo ""

# Esperar a que el usuario presione Ctrl+C
wait

