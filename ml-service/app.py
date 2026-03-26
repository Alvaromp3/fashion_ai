"""Flask ML entrypoint: loads `fashion_ml` from `./src` (used by `hf-space/space_app.py` as `import app`)."""
from __future__ import annotations

import os
import sys
import threading

_ML_DIR = os.path.dirname(os.path.abspath(__file__))
_SRC = os.path.join(_ML_DIR, "src")
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from fashion_ml import labels
from fashion_ml.config import VIT_MODEL_PATH
from fashion_ml.flask_app import app
from fashion_ml.image_ops import allowed_file, detect_color, logits_to_probs, preprocess_image
from fashion_ml.model_loader import models

# --- Legacy attributes (space_app.py, tests) ---
model = None
vit_model = None
vit_input_size = 224
class_names = labels.CLASS_NAMES
class_to_tipo = labels.CLASS_TO_TIPO
tipo_por_indice = labels.TIPO_POR_INDICE
KERAS_HUB_AVAILABLE = False


def preprocess_image_vit(image):
    return preprocess_image(image, target_size=models.vit_input_size, normalize=False)


def load_model():
    """Load ViT weights into process memory (call once)."""
    global model, vit_model, vit_input_size, KERAS_HUB_AVAILABLE
    models.load_classification_model(VIT_MODEL_PATH)
    model = models.vit
    vit_model = models.vit
    vit_input_size = models.vit_input_size
    KERAS_HUB_AVAILABLE = models.keras_hub_available


def _load_models_background():
    load_model()
    if models.vit is not None:
        print("✅ ViT listo para clasificar.", flush=True)
    else:
        print("❌ ViT no está listo (revisa ML_VIT_PATH y logs).", flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6001))
    print("Fashion AI ML Service", flush=True)
    print(f"   ViT: {VIT_MODEL_PATH}", flush=True)
    print(f"Binding to http://0.0.0.0:{port} (models loading in background)...", flush=True)
    t = threading.Thread(target=_load_models_background, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
