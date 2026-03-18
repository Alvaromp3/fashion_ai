#!/bin/bash
# Arranca backend + frontend + ML (los tres servicios).
# Para solo backend: ./start-all.sh o ./run.sh

echo "Starting Fashion AI - All services (backend + frontend + ML)..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    pkill -f "node.*server.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "python.*app.py" 2>/dev/null
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
mkdir -p "$SCRIPT_DIR/logs"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

"$SCRIPT_DIR/stop-all.sh" >/dev/null 2>&1 || true
sleep 2

echo -e "${BLUE}Starting Backend (4000)...${NC}"
cd "$SCRIPT_DIR/backend"
: > "$SCRIPT_DIR/logs/backend.log"
nohup node server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 </dev/null &
sleep 1

echo -e "${BLUE}Starting Frontend (3000)...${NC}"
( cd "$SCRIPT_DIR/frontend" && nohup npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 </dev/null & )
sleep 1

echo -e "${BLUE}Starting ML (6001)...${NC}"
ML_DIR="$SCRIPT_DIR/ml-service"
cd "$ML_DIR"
# Asegurar venv funcional (algunos commits tenían venv incompleto sin bin/)
if [ ! -x "$ML_DIR/venv/bin/python" ]; then
  if command -v python3.11 >/dev/null 2>&1; then
    echo -e "${YELLOW}  ML: creando venv con python3.11 (primera vez)...${NC}"
    ( cd "$ML_DIR" && python3.11 -m venv venv ) || true
  fi
fi
export ML_CNN_PATH="${ML_CNN_PATH:-$SCRIPT_DIR/ml-service/modelo_ropa.h5}"
DEFAULT_USER_VIT="/Users/alvaromartin-pena/Desktop/vit_fashion_outputs/best_model_17_marzo.keras"
if [ -z "${ML_VIT_PATH:-}" ] && [ -f "$DEFAULT_USER_VIT" ]; then
  export ML_VIT_PATH="$DEFAULT_USER_VIT"
else
  export ML_VIT_PATH="${ML_VIT_PATH:-$SCRIPT_DIR/ml-service/vision_transformer_fashion_model.keras}"
fi
export ML_VIT_REAL_PATH="${ML_VIT_REAL_PATH:-$SCRIPT_DIR/ml-service/vit_real_pictures/best_model_real_pictures.keras}"
if [ -x venv/bin/python ]; then
  : > "$SCRIPT_DIR/logs/ml-service.log"
  nohup env ML_CNN_PATH="$ML_CNN_PATH" ML_VIT_PATH="$ML_VIT_PATH" venv/bin/python app.py >> "$SCRIPT_DIR/logs/ml-service.log" 2>&1 </dev/null &
fi
sleep 20

echo -e "${BLUE}Health check...${NC}"
OK=1
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:4000/api/health 2>/dev/null || echo "000")
  [ "$code" = "200" ] && echo -e "${GREEN}  ✓ Backend OK${NC}" && break
  sleep 1
done
[ "$code" != "200" ] && OK=0
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:6001/health 2>/dev/null || echo "000")
  [ "$code" = "200" ] && echo -e "${GREEN}  ✓ ML OK${NC}" && break
  sleep 1
done
[ "$code" != "200" ] && echo -e "${YELLOW}  ✗ ML no respondió${NC}" && OK=0
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:3000/ 2>/dev/null || echo "000")
  [ "$code" = "200" ] && echo -e "${GREEN}  ✓ Frontend OK${NC}" && break
  sleep 1
done
[ "$code" != "200" ] && echo -e "${YELLOW}  ✗ Frontend no respondió${NC}" && OK=0

echo ""
echo -e "${GREEN}Backend: http://localhost:4000  |  Frontend: http://localhost:3000  |  ML: http://localhost:6001${NC}"
echo -e "Para parar: ${GREEN}./stop-all.sh${NC} o Ctrl+C"
echo ""
wait
