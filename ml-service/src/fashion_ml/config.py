"""Environment-driven paths and limits. No secrets required for public HF weights."""

from __future__ import annotations

import os
from pathlib import Path

# ml-service/ root (parent of src/). Override when the package is vendored (e.g. HF Space Docker).
_default_root = Path(__file__).resolve().parent.parent.parent
_env_root = os.environ.get("FASHION_ML_ROOT", "").strip()
ML_SERVICE_ROOT = Path(_env_root).resolve() if _env_root else _default_root

# Optional: download ViT from Hub before load (startup script or manual)
HF_VIT_REPO_ID = os.environ.get("HF_VIT_REPO_ID", "").strip()  # e.g. Alvaro05/vit-fashion
HF_VIT_FILENAME = os.environ.get("HF_VIT_FILENAME", "best_model_17_marzo.keras").strip()

# Single classification artifact (ViT, Keras .keras)
DEFAULT_VIT_FILENAME = "best_model_17_marzo.keras"

# Max upload body (align with backend multer 10MB)
MAX_UPLOAD_BYTES = int(os.environ.get("ML_MAX_UPLOAD_MB", "12")) * 1024 * 1024

IMG_SIZE = 224

ALLOWED_EXTENSIONS = frozenset(
    {"png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "bmp", "tiff", "tif"}
)


def resolve_vit_path() -> Path:
    """ViT weights: ML_VIT_PATH, then ml-service/models/best_model_17_marzo.keras."""
    env = os.environ.get("ML_VIT_PATH")
    if env:
        return Path(env).resolve()
    return ML_SERVICE_ROOT / "models" / DEFAULT_VIT_FILENAME


VIT_MODEL_PATH = resolve_vit_path()
