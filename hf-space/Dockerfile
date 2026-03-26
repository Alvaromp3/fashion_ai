# Build from repository root (loads shared ml-service package):
#   docker build -f hf-space/Dockerfile .
#
# Models: GitHub Release assets OR set HF_VIT_URL to a public .keras URL (e.g. Hugging Face resolve URL).

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip \
    && rm -rf /var/lib/apt/lists/*

COPY ml-service/requirements.txt /app/ml-service/requirements.txt
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r /app/ml-service/requirements.txt

COPY ml-service/src /app/ml-service/src
COPY ml-service/app.py /app/ml-service/app.py
COPY hf-space/space_app.py /app/ml-service/space_app.py

ARG GITHUB_REPO=Alvaromp3/fashion_ai
ARG MODELS_RELEASE_TAG=models-v1.0
# Optional: direct ViT URL (public Hub file). Example:
# https://huggingface.co/Alvaro05/vit-fashion/resolve/main/best_model_17_marzo.keras
ARG HF_VIT_URL=

ENV FASHION_ML_ROOT=/app \
    ML_CNN_PATH=/app/models/modelo_ropa.h5 \
    ML_VIT_PATH=/app/models/best_model_17_marzo.keras

RUN mkdir -p /app/models /tmp/model_dl && \
    if [ -n "$HF_VIT_URL" ]; then \
      echo "Downloading ViT from HF_VIT_URL..." && \
      curl -sLf -o /app/models/best_model_17_marzo.keras "$HF_VIT_URL" && \
      [ -s /app/models/best_model_17_marzo.keras ] || (echo "ViT download failed"; exit 1); \
    else \
      BASE="https://github.com/${GITHUB_REPO}/releases/download/${MODELS_RELEASE_TAG}" && \
      echo "Downloading from ${GITHUB_REPO} @ ${MODELS_RELEASE_TAG}..." && \
      (curl -sLf -o /app/models/modelo_ropa.h5 "${BASE}/modelo_ropa.h5" && [ -s /app/models/modelo_ropa.h5 ]) || \
      (curl -sLf -o /tmp/model_dl/cnn.zip "${BASE}/cnn_model_v1.zip" && unzip -o -q /tmp/model_dl/cnn.zip -d /tmp/model_dl && \
       find /tmp/model_dl -name "*.h5" -exec cp {} /app/models/modelo_ropa.h5 \;) && \
      [ -s /app/models/modelo_ropa.h5 ] || (echo "CNN model required"; exit 1) && \
      (curl -sLf -o /app/models/best_model_17_marzo.keras "${BASE}/best_model_17_marzo.keras" && [ -s /app/models/best_model_17_marzo.keras ]) || \
      (curl -sLf -o /app/models/best_model_17_marzo.keras "${BASE}/vision_transformer_moda_modelo.keras" && [ -s /app/models/best_model_17_marzo.keras ]) || \
      (curl -sLf -o /tmp/model_dl/vit.zip "${BASE}/vit_model_v1.zip" && unzip -o -q /tmp/model_dl/vit.zip -d /tmp/model_dl 2>/dev/null; \
       find /tmp/model_dl -name "*.keras" 2>/dev/null | head -1 | xargs -I {} cp {} /app/models/best_model_17_marzo.keras 2>/dev/null; true); \
    fi && \
    rm -rf /tmp/model_dl && \
    echo "Models ready."

WORKDIR /app/ml-service

EXPOSE 7860
CMD ["uvicorn", "space_app:app", "--host", "0.0.0.0", "--port", "7860"]
