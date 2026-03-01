# Fashion AI ML — Hugging Face Space (FastAPI)
# 1) Create a GitHub Release with assets: modelo_ropa.h5, vision_transformer_moda_modelo.keras
# 2) Set your repo here (for public repo) or add Repository secrets on HF: GITHUB_REPO, MODELS_RELEASE_TAG, GITHUB_TOKEN

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py space_app.py ./

# Download models from GitHub Release (inline; no script file needed)
ARG GITHUB_REPO=Alvaromp3/fashion_ai
ARG MODELS_RELEASE_TAG=models-v1.0
RUN mkdir -p /app/models /tmp/model_dl && \
    BASE="https://github.com/${GITHUB_REPO}/releases/download/${MODELS_RELEASE_TAG}" && \
    echo "Downloading from ${GITHUB_REPO} @ ${MODELS_RELEASE_TAG}..." && \
    (curl -sLf -o /app/models/modelo_ropa.h5 "${BASE}/modelo_ropa.h5" && [ -s /app/models/modelo_ropa.h5 ]) || \
    (curl -sLf -o /tmp/model_dl/cnn.zip "${BASE}/cnn_model_v1.zip" && unzip -o -q /tmp/model_dl/cnn.zip -d /tmp/model_dl && \
     find /tmp/model_dl -name "*.h5" -exec cp {} /app/models/modelo_ropa.h5 \;) && \
    [ -s /app/models/modelo_ropa.h5 ] || (echo "CNN model required"; exit 1) && \
    (curl -sLf -o /app/models/vision_transformer_moda_modelo.keras "${BASE}/vision_transformer_moda_modelo.keras" && [ -s /app/models/vision_transformer_moda_modelo.keras ]) || \
    (curl -sLf -o /tmp/model_dl/vit.zip "${BASE}/vit_model_v1.zip" && unzip -o -q /tmp/model_dl/vit.zip -d /tmp/model_dl 2>/dev/null; \
     find /tmp/model_dl -name "*.keras" 2>/dev/null | head -1 | xargs -I {} cp {} /app/models/vision_transformer_moda_modelo.keras 2>/dev/null; true) && \
    rm -rf /tmp/model_dl && \
    echo "Models ready (ViT optional)."

ENV ML_CNN_PATH=/app/models/modelo_ropa.h5
ENV ML_VIT_PATH=/app/models/vision_transformer_moda_modelo.keras

EXPOSE 7860
CMD ["uvicorn", "space_app:app", "--host", "0.0.0.0", "--port", "7860"]
