"""Optional FastAPI app: /predict (ViT), /health — same semantics as Flask classify-vit."""

from __future__ import annotations

import io
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from fashion_ml.config import MAX_UPLOAD_BYTES, VIT_MODEL_PATH
from fashion_ml.image_ops import allowed_file, detect_color
from fashion_ml.model_loader import build_classification_response, models

app = FastAPI(title="Fashion AI ML", version="1.0.0")

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()] or ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    vit_ok = models.vit is not None
    p = VIT_MODEL_PATH
    return {
        "status": "OK",
        "model_loaded": vit_ok,
        "model_file": p.name,
        "model_file_exists": p.is_file(),
        "vit_model_loaded": vit_ok,
        "vit_model_file_exists": p.is_file(),
        "classes_count": 10,
    }


@app.post("/predict")
async def predict(imagen: UploadFile = File(..., alias="imagen")):
    """
    ViT classification (same JSON as POST /classify-vit on Flask).
    Multipart field name: imagen
    """
    if not imagen.filename or not allowed_file(imagen.filename):
        raise HTTPException(status_code=400, detail="Invalid or missing image file")
    raw = await imagen.read()
    if not raw:
        raise HTTPException(status_code=400, detail="No image provided")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    try:
        image = Image.open(io.BytesIO(raw))
        if image.mode != "RGB":
            image = image.convert("RGB")
        color = detect_color(image)
        if models.vit is None:
            raise HTTPException(
                status_code=503,
                detail={"error": "Vision Transformer model not available", "model_loaded": False},
            )
        probs, _ = models.predict_vit(image)
        return build_classification_response(
            probs, color, "vision_transformer", Path(VIT_MODEL_PATH).name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
