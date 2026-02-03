# Build with:
#   docker build -f ml-service/Dockerfile \
#     --build-arg GITHUB_REPO=YOUR_USER/fashion_program \
#     --build-arg MODELS_RELEASE_TAG=models-v1.0 \
#     -t fashion-ml ./ml-service
#
# For private repo, pass a token (do not commit it):
#   --build-arg GITHUB_TOKEN=ghp_xxx

FROM python:3.11-slim

WORKDIR /app

# Install deps for image handling and curl for downloading models
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

# GitHub release: repo (owner/name) and release tag. Models are downloaded from there.
ARG GITHUB_REPO
ARG MODELS_RELEASE_TAG=models-v1.0
ARG GITHUB_TOKEN

RUN if [ -z "$GITHUB_REPO" ]; then \
    echo "Build-arg GITHUB_REPO is required. Example: --build-arg GITHUB_REPO=owner/fashion_program"; exit 1; \
    fi && \
    BASE="https://github.com/${GITHUB_REPO}/releases/download/${MODELS_RELEASE_TAG}" && \
    if [ -n "$GITHUB_TOKEN" ]; then \
    curl -sL -H "Authorization: token ${GITHUB_TOKEN}" -o /app/modelo_ropa.h5 "${BASE}/modelo_ropa.h5" && \
    curl -sL -H "Authorization: token ${GITHUB_TOKEN}" -o /app/vision_transformer_moda_modelo.keras "${BASE}/vision_transformer_moda_modelo.keras"; \
    else \
    curl -sL -o /app/modelo_ropa.h5 "${BASE}/modelo_ropa.h5" && \
    curl -sL -o /app/vision_transformer_moda_modelo.keras "${BASE}/vision_transformer_moda_modelo.keras"; \
    fi && \
    ls -la /app/modelo_ropa.h5 /app/vision_transformer_moda_modelo.keras

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir -r requirements-base.txt 2>/dev/null || true
RUN pip install --no-cache-dir keras-hub 2>/dev/null || true

# Copy app and optional metrics/images (models already in /app from download)
COPY app.py .
COPY model_metrics.json model_metrics_vit.json .
COPY confusion_matrix.png confusion_matrix_vit.png data_audit.png .

ENV FLASK_APP=app.py
EXPOSE 5001

CMD ["python", "app.py"]
