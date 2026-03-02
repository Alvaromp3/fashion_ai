#!/usr/bin/env bash
# Entrenamiento ViT con Python 3.11 del venv (evita problemas de dependencias).
# Si se queda colgado en "Epoch 1/10": usa USE_IMAGE_DATAGEN=1 ./run_train_vit.sh
set -e
cd "$(dirname "$0")"
if [[ ! -d venv ]]; then
  echo "Crea el venv: python3.11 -m venv venv && ./venv/bin/pip install -r requirements.txt"
  exit 1
fi
PY="${PWD}/venv/bin/python3.11"
if [[ ! -x "$PY" ]]; then
  echo "python3.11 no encontrado en venv. Crea el venv con: python3.11 -m venv venv"
  exit 1
fi
echo "Usando: $PY ($("$PY" -c 'import sys; print(sys.version)'))"
"$PY" -m pip install -q -r requirements.txt
exec "$PY" train_vit.py "$@"
