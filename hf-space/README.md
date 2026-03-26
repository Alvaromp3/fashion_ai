# Fashion AI — Garment classification (ViT)

HTTP API for classifying clothing images. Used by the [Fashion AI](https://github.com/Alvaromp3/fashion_ai) app.

## Model

- Single classifier: **`best_model_17_marzo.keras`** (Vision Transformer via TensorFlow/Keras).
- Environment: **`ML_VIT_PATH`** (default `/app/models/best_model_17_marzo.keras` in Docker).

## Endpoints

- **POST `/classify`** — ViT classification (form field `imagen`: image file)
- **POST `/classify-vit`** — Same ViT classifier (form field `imagen`)
- **POST `/predict`** — Alias for `/classify-vit` (same as FastAPI `run_fastapi.py`)
- **GET `/health`** — Status and model load

## Deploy (Docker)

Build from **repository root**:

```bash
docker build -f hf-space/Dockerfile .
```

The Dockerfile downloads **`best_model_17_marzo.keras`** from your GitHub Release (`models-v1.0` by default) or from **`HF_VIT_URL`**.

Release asset: run `./scripts/publish-models-release.sh` from the repo root (expects `ml-service/models/best_model_17_marzo.keras`).

## Backend

Set **`ML_SERVICE_URL`** to this Space URL (no trailing slash). The backend calls **`/classify-vit`** for garment classification.

Optional **`ML_VIT_SERVICE_URL`**: separate Space URL if you split traffic; otherwise the same URL as `ML_SERVICE_URL` is enough.
