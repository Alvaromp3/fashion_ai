#!/bin/bash
# Arranca backend + frontend + ML en local. Usa backend/.env para el backend.
# Para parar: ./stop-all.sh

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
mkdir -p "$SCRIPT_DIR/logs"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all services...${NC}"
  pkill -f "node.*server.js" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  pkill -f "python.*app.py" 2>/dev/null || true
  echo -e "${GREEN}Services stopped${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Stopping any services on 3000, 4000, 6001...${NC}"
"$SCRIPT_DIR/stop-all.sh" 2>/dev/null || true
sleep 2

# --- Backend ---
echo -e "${BLUE}Starting Backend (4000)...${NC}"
: > "$SCRIPT_DIR/logs/backend.log"
cd "$SCRIPT_DIR/backend"
nohup node server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 </dev/null &
cd "$SCRIPT_DIR"
sleep 1

# --- Frontend ---
echo -e "${BLUE}Starting Frontend (3000)...${NC}"
: > "$SCRIPT_DIR/logs/frontend.log"
cd "$SCRIPT_DIR/frontend"
nohup npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 </dev/null &
cd "$SCRIPT_DIR"
sleep 1

# --- ML: usar Python 3.11 del venv (donde están las dependencias) ---
echo -e "${BLUE}Starting ML (6001)...${NC}"
ML_DIR="$SCRIPT_DIR/ml-service"

# Asegurar venv funcional (algunos commits tenían venv incompleto sin bin/)
if [ ! -x "$ML_DIR/venv/bin/python" ]; then
  if command -v python3.11 >/dev/null 2>&1; then
    echo -e "${YELLOW}  ML: creando venv con python3.11 (primera vez)...${NC}"
    ( cd "$ML_DIR" && python3.11 -m venv venv ) || true
  fi
fi

ML_VENV_PYTHON="$ML_DIR/venv/bin/python3.11"
[ ! -x "$ML_VENV_PYTHON" ] && ML_VENV_PYTHON="$ML_DIR/venv/bin/python"
export ML_CNN_PATH="${ML_CNN_PATH:-$ML_DIR/modelo_ropa.h5}"

# ViT: forzar SIEMPRE el modelo solicitado (sin fallback a otros modelos).
DEFAULT_USER_VIT="/Users/alvaromartin-pena/Desktop/vit_fashion_outputs/best_model_17_marzo.keras"
if [ -f "$DEFAULT_USER_VIT" ]; then
  export ML_VIT_PATH="$DEFAULT_USER_VIT"
else
  echo -e "${YELLOW}ML: ERROR — no se encontró: $DEFAULT_USER_VIT${NC}"
  echo -e "${YELLOW}Copia/ubica el archivo best_model_17_marzo.keras y vuelve a ejecutar ./start-all.sh${NC}"
  exit 1
fi

if [ ! -x "$ML_VENV_PYTHON" ]; then
  echo -e "${YELLOW}  ML: no hay venv. Crea uno: cd ml-service && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
else
  if ! "$ML_VENV_PYTHON" -c "import flask" 2>/dev/null; then
    echo -e "${YELLOW}  ML: instalando dependencias (puede tardar 2-5 min)...${NC}"
    ( cd "$ML_DIR" && venv/bin/python -m pip install -U pip && venv/bin/python -m pip install -r requirements.txt ) || true
    echo -e "${GREEN}  ML: dependencias listas.${NC}"
  fi
  : > "$SCRIPT_DIR/logs/ml-service.log"
  cd "$ML_DIR" && nohup env ML_CNN_PATH="$ML_CNN_PATH" ML_VIT_PATH="$ML_VIT_PATH" "$ML_VENV_PYTHON" app.py >> "$SCRIPT_DIR/logs/ml-service.log" 2>&1 </dev/null &
  cd "$SCRIPT_DIR"
fi

echo -e "${BLUE}Waiting for services (~25s)...${NC}"
sleep 25

# --- Health checks (sin set -e: que un fallo no cierre el script) ---
echo -e "${BLUE}Health check...${NC}"
OK=1
code="000"
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:4000/api/health 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then echo -e "${GREEN}  ✓ Backend OK${NC}"; break; fi
  sleep 1
done
if [ "$code" != "200" ]; then echo -e "${YELLOW}  ✗ Backend no respondió${NC}"; OK=0; fi

code="000"
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:6001/health 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then echo -e "${GREEN}  ✓ ML OK${NC}"; break; fi
  sleep 1
done
if [ "$code" != "200" ]; then echo -e "${YELLOW}  ✗ ML no respondió (ver logs/ml-service.log)${NC}"; OK=0; fi

# Comprobar que ambos modelos (CNN y ViT) están cargados según /health
if [ "$code" = "200" ]; then
  echo -e "${BLUE}Checking ML models (CNN + ViT)...${NC}"
  models_ok=0
  for i in $(seq 1 60); do
    health_json=$(curl -s --connect-timeout 3 http://127.0.0.1:6001/health 2>/dev/null || echo "")
    echo "$health_json" | grep -q '"model_loaded": true' && \
    echo "$health_json" | grep -q '"vit_model_loaded": true'
    if [ "$?" = "0" ]; then
      echo -e "${GREEN}  ✓ ML models loaded (CNN + ViT)${NC}"
      models_ok=1
      break
    fi
    sleep 2
  done
  if [ "$models_ok" != "1" ]; then
    echo -e "${YELLOW}  ⚠ ML responde pero ViT aún no está cargado (revisa logs/ml-service.log o espera un poco más).${NC}"
  fi
fi

code="000"
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:3000/ 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then echo -e "${GREEN}  ✓ Frontend OK${NC}"; break; fi
  sleep 1
done
if [ "$code" != "200" ]; then echo -e "${YELLOW}  ✗ Frontend no respondió${NC}"; OK=0; fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
if [ "$OK" = "1" ]; then
  echo -e "${GREEN}Todo en marcha.${NC}"
else
  echo -e "${YELLOW}Alguno falló. Logs: tail -30 logs/backend.log logs/ml-service.log logs/frontend.log${NC}"
fi
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Backend:  http://localhost:4000"
echo -e "  Frontend: http://localhost:3000"
echo -e "  ML:       http://localhost:6001"
echo ""
echo -e "Para parar: ${GREEN}./stop-all.sh${NC} o Ctrl+C"
echo ""
wait
