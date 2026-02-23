# Ports – Fashion AI

All three services use fixed ports so you can run and inspect them consistently.

| Service   | Port | URL                      | Health / inspect              |
|----------|------|--------------------------|-------------------------------|
| Frontend | 3000 | http://localhost:3000   | Open in browser               |
| Backend  | 4000 | http://localhost:4000   | http://localhost:4000/api/health |
| ML       | 6001 | http://localhost:6001   | http://localhost:6001/health |

- Start all: `./start-all.sh`
- Stop all: `./stop-all.sh`
- Check ports: `./check-ports.sh`
