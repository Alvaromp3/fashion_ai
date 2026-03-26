"""
FastAPI for Hugging Face Spaces — same HTTP contract as ml-service (Flask).
Run: uvicorn space_app:app --host 0.0.0.0 --port 7860
"""
from __future__ import annotations

import io
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app as ml_app
from fashion_ml.config import VIT_MODEL_PATH
from fashion_ml.image_ops import detect_color
from fashion_ml.model_loader import build_classification_response, models

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()] or ["*"]


def _vit_name() -> str:
    return Path(VIT_MODEL_PATH).name


def _classify_vit(image_bytes: bytes) -> dict:
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    color = detect_color(image)
    if models.vit is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Models still loading", "loading": True},
        )
    probs, _ = models.predict_vit(image)
    return build_classification_response(probs, color, "vision_transformer", _vit_name())


@asynccontextmanager
async def lifespan(_: FastAPI):
    ml_app.load_model()
    yield


app = FastAPI(
    title="Fashion AI ML",
    description="ViT garment classification (best_model_17_marzo.keras)",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Fashion AI ML API",
        "docs": "/docs",
        "health": "/health",
        "classify": "POST /classify (ViT)",
        "classify_vit": "POST /classify-vit (ViT)",
    }


@app.get("/health")
def health():
    vit_p = Path(VIT_MODEL_PATH)
    vit_ok = models.vit is not None
    return {
        "status": "OK",
        "model_loaded": vit_ok,
        "model_file": vit_p.name,
        "model_file_exists": vit_p.is_file(),
        "model_path": str(vit_p.resolve()) if vit_p.is_file() else None,
        "vit_model_loaded": vit_ok,
        "vit_model_file_exists": vit_p.is_file(),
        "vit_model_path": str(vit_p.resolve()) if vit_p.is_file() else None,
        "classes_count": len(ml_app.class_names) if ml_app.class_names else 0,
    }


@app.post("/classify")
async def classify(imagen: UploadFile = File(..., alias="imagen")):
    if not imagen.filename or not ml_app.allowed_file(imagen.filename):
        raise HTTPException(status_code=400, detail="Invalid or missing image file")
    contents = await imagen.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        return _classify_vit(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/classify-vit")
async def classify_vit(imagen: UploadFile = File(..., alias="imagen")):
    if not imagen.filename or not ml_app.allowed_file(imagen.filename):
        raise HTTPException(status_code=400, detail="Invalid or missing image file")
    contents = await imagen.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        return _classify_vit(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/predict")
async def predict(imagen: UploadFile = File(..., alias="imagen")):
    return await classify_vit(imagen)
