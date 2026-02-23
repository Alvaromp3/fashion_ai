#!/bin/bash
# Arranca Fashion AI con el ML Service en Docker (CNN + ViT estables). Backend y frontend en local.

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    docker compose -f docker-compose.ml.yml down 2>/dev/null || true
    echo -e "${GREEN}Done${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker no está instalado. Instálalo y vuelve a ejecutar."
    exit 1
fi

docker compose -f docker-compose.ml.yml down 2>/dev/null || true
docker build -t fashion-ml ./ml-service
echo -e "${BLUE}Starting ML Service (Docker)...${NC}"
docker compose -f docker-compose.ml.yml up -d

mkdir -p "$SCRIPT_DIR/logs"
echo -e "${BLUE}Starting Backend (4000)...${NC}"
cd "$SCRIPT_DIR/backend"
ML_SERVICE_URL=http://localhost:6001 node server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 &
echo -e "${BLUE}Starting Frontend (3000)...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 &

(sleep 15; if command -v curl >/dev/null 2>&1; then
  HEALTH=$(curl -s --connect-timeout 3 --max-time 5 http://localhost:6001/health 2>/dev/null)
  if echo "$HEALTH" | grep -q '"vit_model_loaded":true'; then
    echo -e "${GREEN}  ✓ CNN y ViT cargados (Docker)${NC}"
  elif echo "$HEALTH" | grep -q '"model_loaded":true'; then
    echo -e "${YELLOW}  ⚠ Solo CNN cargado. Revisa: docker logs fashion-ml${NC}"
  fi
fi) &

echo ""
echo -e "${GREEN}All services running (ML in Docker)${NC}"
echo ""
echo -e "  Backend:    http://localhost:4000"
echo -e "  ML (Docker): http://localhost:6001"
echo -e "  Frontend:   http://localhost:3000"
echo ""
echo -e "${YELLOW}  Abre http://localhost:3000  |  Ctrl+C para parar${NC}"
echo ""
wait
