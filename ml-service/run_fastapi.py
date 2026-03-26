#!/usr/bin/env python3
"""Run FastAPI server (optional). Loads models at startup. Port: PORT or 6001."""

from __future__ import annotations

import os
import sys

_ML_DIR = os.path.dirname(os.path.abspath(__file__))
_SRC = os.path.join(_ML_DIR, "src")
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from fashion_ml.config import CNN_MODEL_PATH, VIT_MODEL_PATH
from fashion_ml.model_loader import models
from fashion_ml.fastapi_app import app as fastapi_app


def main():
    models.load_all(CNN_MODEL_PATH, VIT_MODEL_PATH)
    import uvicorn

    port = int(os.environ.get("PORT", 6001))
    uvicorn.run(fastapi_app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
