#!/bin/bash
# Comprueba si el backend responde en http://localhost:4000
echo "Comprobando backend en http://localhost:4000 ..."
if command -v curl >/dev/null 2>&1; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 5 http://localhost:4000/api/health 2>/dev/null)
  if [ "$CODE" = "200" ]; then
    echo "OK: Backend responde correctamente."
    curl -s http://localhost:4000/api/health
    exit 0
  fi
fi
echo "ERROR: El backend no responde en el puerto 4000."
echo "  1. Ejecuta: ./stop-all.sh"
echo "  2. Luego:   ./start-all.sh"
echo "  3. Si sigue fallando, revisa: logs/backend.log"
exit 1
