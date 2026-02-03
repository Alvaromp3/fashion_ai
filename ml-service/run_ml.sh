#!/bin/bash
# Arranca el ML service en primer plano para ver que CNN y ViT carguen correctamente.
# Modelos esperados: modelo_ropa.h5, vision_transformer_moda_modelo.keras

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CNN="$SCRIPT_DIR/modelo_ropa.h5"
VIT="$SCRIPT_DIR/vision_transformer_moda_modelo.keras"

if [ ! -f "$CNN" ]; then
  echo "❌ CNN no encontrado: $CNN"
  exit 1
fi
if [ ! -f "$VIT" ]; then
  echo "❌ ViT no encontrado: $VIT"
  exit 1
fi
echo "✅ CNN: $CNN"
echo "✅ ViT: $VIT"

if [ ! -d venv ]; then
  echo "❌ No existe venv. Crea uno: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

source venv/bin/activate
echo "🚀 Iniciando ML service (puerto 5001)..."
exec python app.py
