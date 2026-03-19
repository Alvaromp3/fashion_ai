.PHONY: help up down restart status health logs logs-follow frontend-restart clean

SHELL := /bin/bash

ROOT_DIR := $(CURDIR)
LOG_DIR := $(ROOT_DIR)/logs

help:
	@echo "Fashion AI — commands"
	@echo ""
	@echo "  make up              Start backend + frontend + ML"
	@echo "  make down            Stop everything"
	@echo "  make restart         Stop everything (free ports)"
	@echo "  make status          Show listening ports (3000/4000/6001)"
	@echo "  make health          Call /api/health and /health endpoints"
	@echo "  make logs            Print last lines of logs"
	@echo "  make logs-follow      Follow logs (Ctrl+C to stop)"
	@echo "  make frontend-restart Restart only Vite frontend"
	@echo "  make clean            Remove generated artifacts (safe)"
	@echo ""

up:
	@mkdir -p "$(LOG_DIR)"
	@./start-all.sh

down:
	@./stop-all.sh

restart:
	@./stop-all.sh

status:
	@echo "Listening ports:"
	@lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null | head -n 2 || true
	@lsof -nP -iTCP:4000 -sTCP:LISTEN 2>/dev/null | head -n 2 || true
	@lsof -nP -iTCP:6001 -sTCP:LISTEN 2>/dev/null | head -n 2 || true

health:
	@echo "Backend:"
	@curl -s http://127.0.0.1:4000/api/health || true
	@echo ""
	@echo "ML:"
	@curl -s http://127.0.0.1:6001/health || true
	@echo ""
	@echo "Frontend HTTP:"
	@curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://127.0.0.1:3000/ || true

logs:
	@echo "== backend.log ==";  tail -n 80 "$(LOG_DIR)/backend.log" 2>/dev/null || true
	@echo ""
	@echo "== ml-service.log =="; tail -n 120 "$(LOG_DIR)/ml-service.log" 2>/dev/null || true
	@echo ""
	@echo "== frontend.log =="; tail -n 120 "$(LOG_DIR)/frontend.log" 2>/dev/null || true

logs-follow:
	@mkdir -p "$(LOG_DIR)"
	@tail -f "$(LOG_DIR)/backend.log" "$(LOG_DIR)/ml-service.log" "$(LOG_DIR)/frontend.log"

frontend-restart:
	@echo "Restarting frontend (Vite) on :3000..."
	@pkill -f "vite.*--port 3000" 2>/dev/null || true
	@mkdir -p "$(LOG_DIR)"
	@cd "$(ROOT_DIR)/frontend" && nohup npm run dev >> "$(LOG_DIR)/frontend.log" 2>&1 </dev/null &
	@sleep 2
	@curl -s -o /dev/null -w "Frontend HTTP: %{http_code}\n" --max-time 5 http://127.0.0.1:3000/ || true

clean:
	@echo "Cleaning generated artifacts..."
	@rm -rf "$(ROOT_DIR)/frontend/dist" 2>/dev/null || true
	@rm -rf "$(ROOT_DIR)/ml-service/__pycache__" 2>/dev/null || true
	@rm -rf "$(ROOT_DIR)/ml-service/temp" 2>/dev/null || true
	@echo "Done."

