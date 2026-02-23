#!/bin/bash
# Arranca el ML service en primer plano para ver que CNN y ViT carguen correctamente.
# Modelos esperados: modelo_ropa.h5, vision_transformer_moda_modelo.keras

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Rutas absolutas de modelos (ViT: vision_transformer_moda_modelo.keras; CNN: modelo_ropa.h5)
CNN="${ML_CNN_PATH:-$SCRIPT_DIR/modelo_ropa.h5}"
VIT="${ML_VIT_PATH:-$SCRIPT_DIR/vision_transformer_moda_modelo.keras}"
[ -z "${CNN##/*}" ] || CNN="$SCRIPT_DIR/$CNN"
[ -z "${VIT##/*}" ] || VIT="$SCRIPT_DIR/$VIT"

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
export ML_CNN_PATH="$CNN"
export ML_VIT_PATH="$VIT"
echo "🚀 Iniciando ML service (puerto 6001)..."
exec python app.py
