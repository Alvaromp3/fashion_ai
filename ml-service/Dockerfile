FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=6001 \
    FASHION_ML_ROOT=/app \
    ML_VIT_PATH=/app/models/best_model_17_marzo.keras

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r /app/requirements.txt

COPY src /app/src
COPY app.py /app/app.py
# Before deployment, place best_model_17_marzo.keras in ml-service/models/
COPY models /app/models
RUN python - <<'PY'
from pathlib import Path
import sys

p = Path("/app/models/best_model_17_marzo.keras")
print(f"[build-check] expecting model at: {p}")
print(f"[build-check] exists={p.exists()}")
if not p.exists():
    print("[build-check] ERROR: model file missing from Docker build context.")
    print("[build-check] Ensure ml-service/models/best_model_17_marzo.keras is committed/pushed (Git LFS if large).")
    sys.exit(1)
size = p.stat().st_size
print(f"[build-check] size={size} bytes")
try:
    head = p.read_text(encoding="utf-8", errors="ignore").splitlines()[:2]
except Exception:
    head = []
if head and head[0].strip() == "version https://git-lfs.github.com/spec/v1":
    print("[build-check] ERROR: model file is a Git LFS pointer, not the real binary.")
    print("[build-check] Push the real LFS object and redeploy.")
    sys.exit(1)
PY

EXPOSE 6001

CMD ["python", "app.py"]
