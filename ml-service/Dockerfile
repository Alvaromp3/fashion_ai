# Build: export GITHUB_REPO=owner/repo && docker build -f ml-service/Dockerfile -t fashion-ml ./ml-service
# Private repo: --build-arg GITHUB_TOKEN=ghp_xxx

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

# Download models from GitHub Release (publish first: ./scripts/publish-models-release.sh models-v1.0)
ARG GITHUB_REPO
ARG MODELS_RELEASE_TAG=models-v1.0
ARG GITHUB_TOKEN

COPY scripts/download_models.sh /app/scripts/download_models.sh
RUN chmod +x /app/scripts/download_models.sh && \
    GITHUB_REPO="$GITHUB_REPO" MODELS_RELEASE_TAG="$MODELS_RELEASE_TAG" GITHUB_TOKEN="$GITHUB_TOKEN" /app/scripts/download_models.sh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir -r requirements-base.txt 2>/dev/null || true
RUN pip install --no-cache-dir keras-hub 2>/dev/null || true

# Copy app and optional metrics/images
COPY app.py .
COPY model_metrics.json model_metrics_vit.json .
COPY confusion_matrix.png confusion_matrix_vit.png data_audit.png .

ENV FLASK_APP=app.py
ENV ML_CNN_PATH=/app/models/modelo_ropa.h5
ENV ML_VIT_PATH=/app/models/vision_transformer_moda_modelo.keras
EXPOSE 6001

CMD ["python", "app.py"]
