#!/bin/bash
# Comprueba que los 3 servicios estén escuchando (Frontend 3000, Backend 4000, ML 6001)
echo "Puertos 3000 (frontend), 4000 (backend), 6001 (ML):"
lsof -i :3000 -i :4000 -i :6001 -P -n 2>/dev/null || echo "  Ningún proceso encontrado"
echo ""
echo "Health checks:"
curl -s -o /dev/null -w "  Frontend (3000): HTTP %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "  Frontend: fallo"
curl -s -o /dev/null -w "  Backend (4000):  HTTP %{http_code}\n" http://localhost:4000/api/health 2>/dev/null || echo "  Backend: fallo"
curl -s -o /dev/null -w "  ML (6001):       HTTP %{http_code}\n" http://localhost:6001/health 2>/dev/null || echo "  ML: fallo"
