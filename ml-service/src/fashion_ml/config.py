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

# Max upload body (align with backend multer 10MB)
MAX_UPLOAD_BYTES = int(os.environ.get("ML_MAX_UPLOAD_MB", "12")) * 1024 * 1024

IMG_SIZE = 224

ALLOWED_EXTENSIONS = frozenset(
    {"png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "bmp", "tiff", "tif"}
)


def _first_existing(*candidates: Path) -> Path | None:
    for p in candidates:
        if p.is_file():
            return p
    return None


def resolve_cnn_path() -> Path:
    env = os.environ.get("ML_CNN_PATH")
    if env:
        return Path(env).resolve()
    default = ML_SERVICE_ROOT / "modelo_ropa.h5"
    if default.is_file():
        return default
    return default


def resolve_vit_path() -> Path:
    """ViT weights: ML_VIT_PATH, then models/, then legacy filenames in ml-service root."""
    env = os.environ.get("ML_VIT_PATH")
    if env:
        return Path(env).resolve()
    found = _first_existing(
        ML_SERVICE_ROOT / "models" / "best_model_17_marzo.keras",
        ML_SERVICE_ROOT / "models" / "vision_transformer_moda_modelo.keras",
        ML_SERVICE_ROOT / "vision_transformer_fashion_model.keras",
        ML_SERVICE_ROOT / "vision_transformer_moda_modelo.keras",
    )
    if found is not None:
        return found
    return ML_SERVICE_ROOT / "models" / "best_model_17_marzo.keras"


CNN_MODEL_PATH = resolve_cnn_path()
VIT_MODEL_PATH = resolve_vit_path()
