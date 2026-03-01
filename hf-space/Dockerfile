# Fashion AI ML — Hugging Face Space (FastAPI)
# 1) Create a GitHub Release with assets: modelo_ropa.h5, vision_transformer_moda_modelo.keras
# 2) Set your repo here (for public repo) or add Repository secrets on HF: GITHUB_REPO, MODELS_RELEASE_TAG, GITHUB_TOKEN

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py space_app.py ./
COPY scripts/ ./scripts/

# Download models from GitHub Release. Edit the line below with your repo (e.g. Alvaromp3/fashion_ai).
ARG GITHUB_REPO=Alvaromp3/fashion_ai
ARG MODELS_RELEASE_TAG=models-v1.0
ARG GITHUB_TOKEN
RUN chmod +x /app/scripts/download_models.sh && \
    GITHUB_REPO="${GITHUB_REPO}" MODELS_RELEASE_TAG="${MODELS_RELEASE_TAG}" GITHUB_TOKEN="${GITHUB_TOKEN}" /app/scripts/download_models.sh

ENV ML_CNN_PATH=/app/models/modelo_ropa.h5
ENV ML_VIT_PATH=/app/models/vision_transformer_moda_modelo.keras

EXPOSE 7860
CMD ["uvicorn", "space_app:app", "--host", "0.0.0.0", "--port", "7860"]
