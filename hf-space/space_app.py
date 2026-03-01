"""
FastAPI app for Hugging Face Spaces.
Same inference as Flask app (app.py); compatible with backend ML_SERVICE_URL.
Run: uvicorn space_app:app --host 0.0.0.0 --port 7860
"""
from contextlib import asynccontextmanager
import io
import os

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import inference logic from Flask app (same models, preprocessing)
import app as ml_app

# Allow CORS from Cloudflare Pages and your frontend
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()] or ["*"]


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Load models once at startup (no cold-start per request)."""
    ml_app.load_model()
    yield
    # optional: cleanup


app = FastAPI(
    title="Fashion AI ML",
    description="CNN + ViT classification for garment images",
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
    """Root route so the Space URL doesn't return 404 in the browser."""
    return {
        "message": "Fashion AI ML API",
        "docs": "/docs",
        "health": "/health",
        "classify": "POST /classify (CNN)",
        "classify_vit": "POST /classify-vit (ViT)",
    }


@app.get("/health")
def health():
    """Same response shape as Flask /health for backend /api/ml-health."""
    return {
        "status": "OK",
        "model_loaded": ml_app.model is not None,
        "model_file_exists": os.path.exists(ml_app.CNN_MODEL_PATH),
        "model_path": os.path.abspath(ml_app.CNN_MODEL_PATH) if os.path.exists(ml_app.CNN_MODEL_PATH) else None,
        "vit_model_loaded": ml_app.vit_model is not None,
        "vit_model_file_exists": os.path.exists(ml_app.VIT_MODEL_PATH),
        "vit_model_path": os.path.abspath(ml_app.VIT_MODEL_PATH) if os.path.exists(ml_app.VIT_MODEL_PATH) else None,
        "classes_count": len(ml_app.class_names) if ml_app.class_names else 0,
    }


def _classify_cnn(image_bytes: bytes) -> dict:
    """Run CNN inference; same response as Flask /classify."""
    from PIL import Image
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    color = ml_app.detect_color(image)
    if ml_app.model is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Models still loading", "loading": True},
        )
    img_array = ml_app.preprocess_image(image)
    prediction = ml_app.model.predict(img_array, verbose=0)
    out = prediction[0] if isinstance(prediction, (list, tuple)) else prediction
    logits = np.asarray(out).ravel()
    if len(logits) != 10:
        logits = np.asarray(prediction).ravel()[:10]
    if len(logits) < 10:
        logits = np.zeros(10, dtype=np.float64)
        logits[0] = 1.0
    probs = ml_app.logits_to_probs(logits)
    clase = int(np.argmax(probs))
    confianza = float(probs[clase])
    top3_indices = np.argsort(probs)[-3:][::-1]
    top3_info = []
    for idx in top3_indices:
        if idx < len(ml_app.class_names):
            top3_info.append({
                "clase_nombre": ml_app.class_names[idx],
                "confianza": float(probs[idx]),
                "tipo": ml_app.class_to_tipo.get(ml_app.class_names[idx], "desconocido"),
            })
    clase_nombre = ml_app.class_names[clase] if clase < len(ml_app.class_names) else "desconocido"
    tipo = ml_app.class_to_tipo.get(clase_nombre, ml_app.tipo_por_indice.get(clase, "desconocido"))
    return {
        "clase": clase,
        "clase_nombre": clase_nombre,
        "tipo": tipo,
        "confianza": confianza,
        "color": color,
        "top3": top3_info,
        "model": "cnn",
        "model_file": os.path.basename(ml_app.CNN_MODEL_PATH),
    }


def _classify_vit(image_bytes: bytes) -> dict:
    """Run ViT inference; same response as Flask /classify-vit."""
    from PIL import Image
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    color = ml_app.detect_color(image)
    if ml_app.vit_model is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "Vision Transformer model not available", "model_loaded": False},
        )
    img_array = ml_app.preprocess_image_vit(image)
    prediction = ml_app.vit_model.predict(img_array, verbose=0)
    out = prediction[0] if isinstance(prediction, (list, tuple)) else prediction
    logits = np.asarray(out).ravel()
    if len(logits) != 10:
        logits = np.asarray(prediction).ravel()[:10]
    if len(logits) < 10:
        logits = np.zeros(10, dtype=np.float64)
        logits[0] = 1.0
    probs = ml_app.logits_to_probs(logits)
    clase = int(np.argmax(probs))
    confianza = float(probs[clase])
    top3_indices = np.argsort(probs)[-3:][::-1]
    top3_info = []
    for idx in top3_indices:
        if idx < len(ml_app.class_names):
            top3_info.append({
                "clase_nombre": ml_app.class_names[idx],
                "confianza": float(probs[idx]),
                "tipo": ml_app.class_to_tipo.get(ml_app.class_names[idx], "desconocido"),
            })
    clase_nombre = ml_app.class_names[clase] if clase < len(ml_app.class_names) else "desconocido"
    tipo = ml_app.class_to_tipo.get(clase_nombre, ml_app.tipo_por_indice.get(clase, "desconocido"))
    return {
        "clase": clase,
        "clase_nombre": clase_nombre,
        "tipo": tipo,
        "confianza": confianza,
        "color": color,
        "top3": top3_info,
        "model": "vision_transformer",
        "model_file": os.path.basename(ml_app.VIT_MODEL_PATH),
    }


@app.post("/classify")
async def classify(imagen: UploadFile = File(..., alias="imagen")):
    """
    CNN classification. Accepts multipart form key 'imagen' (same as Flask).
    Backend calls this at ML_SERVICE_URL/classify.
    """
    if not imagen.filename or not ml_app.allowed_file(imagen.filename):
        raise HTTPException(status_code=400, detail="Invalid or missing image file")
    contents = await imagen.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        return _classify_cnn(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify-vit")
async def classify_vit(imagen: UploadFile = File(..., alias="imagen")):
    """
    ViT classification. Accepts multipart form key 'imagen'.
    Backend calls this at ML_SERVICE_URL/classify-vit.
    """
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
        raise HTTPException(status_code=500, detail=str(e))


# Optional: alias for Spaces demos
@app.post("/predict")
async def predict(imagen: UploadFile = File(..., alias="imagen")):
    """Alias for /classify (CNN)."""
    return await classify(imagen)
