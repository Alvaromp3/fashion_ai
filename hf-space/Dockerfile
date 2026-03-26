# Build from repository root (loads shared ml-service package):
#   docker build -f hf-space/Dockerfile .
#
# Models: GitHub Release asset best_model_17_marzo.keras OR set HF_VIT_URL to a public .keras URL (e.g. Hugging Face resolve URL).

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
# https://huggingface.co/USER/REPO/resolve/main/best_model_17_marzo.keras
ARG HF_VIT_URL=

ENV FASHION_ML_ROOT=/app/ml-service \
    ML_VIT_PATH=/app/models/best_model_17_marzo.keras

RUN mkdir -p /app/models /tmp/model_dl && \
    if [ -n "$HF_VIT_URL" ]; then \
      echo "Downloading ViT from HF_VIT_URL..." && \
      curl -sLf -o /app/models/best_model_17_marzo.keras "$HF_VIT_URL" && \
      [ -s /app/models/best_model_17_marzo.keras ] || (echo "ViT download failed"; exit 1); \
    else \
      BASE="https://github.com/${GITHUB_REPO}/releases/download/${MODELS_RELEASE_TAG}" && \
      echo "Downloading ViT from ${GITHUB_REPO} @ ${MODELS_RELEASE_TAG}..." && \
      (curl -sLf -o /app/models/best_model_17_marzo.keras "${BASE}/best_model_17_marzo.keras" && [ -s /app/models/best_model_17_marzo.keras ]) || \
      (curl -sLf -o /tmp/model_dl/vit.zip "${BASE}/vit_model_v1.zip" && unzip -o -q /tmp/model_dl/vit.zip -d /tmp/model_dl 2>/dev/null; \
       f="$(find /tmp/model_dl -name '*.keras' 2>/dev/null | head -1)" && \
       [ -n "$f" ] && cp "$f" /app/models/best_model_17_marzo.keras); \
    fi && \
    [ -s /app/models/best_model_17_marzo.keras ] || (echo "ViT model required: attach best_model_17_marzo.keras to the release or set HF_VIT_URL"; exit 1) && \
    rm -rf /tmp/model_dl && \
    echo "Model ready."

WORKDIR /app/ml-service

EXPOSE 7860
CMD ["uvicorn", "space_app:app", "--host", "0.0.0.0", "--port", "7860"]
