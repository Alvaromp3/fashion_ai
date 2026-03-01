#!/bin/bash
# Arranca el servicio ML en local (puerto 6001). Para todo el stack usa ../start-all.sh desde la raíz.
set -e
ML_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$ML_DIR"

PYTHON="${ML_DIR}/venv/bin/python3.11"
[ ! -x "$PYTHON" ] && PYTHON="${ML_DIR}/venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "ML: no hay venv. Crea uno: cd ml-service && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

export ML_CNN_PATH="${ML_CNN_PATH:-$ML_DIR/modelo_ropa.h5}"
export ML_VIT_PATH="${ML_VIT_PATH:-$ML_DIR/vision_transformer_moda_modelo.keras}"
exec "$PYTHON" app.py
