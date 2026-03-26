# ViT Space (best_model_17_marzo.keras)

Same as the main HF Space: **`hf-space/Dockerfile`** and **`hf-space/Dockerfile.vit`** both build a ViT-only image that loads **`best_model_17_marzo.keras`**.

The backend uses **`ML_SERVICE_URL`** / **`ML_VIT_SERVICE_URL`** with **`POST /classify-vit`** (or **`POST /classify`**, same model).
