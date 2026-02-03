# Build with:
#   docker build -f ml-service/Dockerfile -t fashion-ml ./ml-service
#
# Optional build args (defaults: Alvaromp3/fashion_ai, v1.0.0):
#   --build-arg GITHUB_REPO=Alvaromp3/fashion_ai
#   --build-arg RELEASE_TAG=v1.0.0
# For private repo:
#   --build-arg GITHUB_TOKEN=ghp_xxx

FROM python:3.11-slim

WORKDIR /app

# Install deps for image handling, curl and unzip for downloading/extracting models
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 curl unzip \
    && rm -rf /var/lib/apt/lists/*

# Download models from GitHub Releases (cnn_model_v1.zip, vit_model_v1.zip -> /app/models/)
ARG GITHUB_REPO=Alvaromp3/fashion_ai
ARG RELEASE_TAG=v1.0.0
ARG GITHUB_TOKEN

COPY scripts/download_models.sh /app/scripts/download_models.sh
RUN chmod +x /app/scripts/download_models.sh && \
    GITHUB_REPO="$GITHUB_REPO" RELEASE_TAG="$RELEASE_TAG" GITHUB_TOKEN="$GITHUB_TOKEN" /app/scripts/download_models.sh

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
EXPOSE 5001

CMD ["python", "app.py"]
