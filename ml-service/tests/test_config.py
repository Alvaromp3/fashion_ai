"""Unit tests: config path resolution."""

import os
from pathlib import Path

from fashion_ml.config import ML_SERVICE_ROOT, resolve_classification_model_path


def test_ml_service_root_is_path():
    assert isinstance(ML_SERVICE_ROOT, Path)
    assert ML_SERVICE_ROOT.exists()


def test_resolve_classification_model_path_env_override(tmp_path, monkeypatch):
    fake = tmp_path / "fake.keras"
    fake.write_bytes(b"x")
    monkeypatch.setenv("ML_VIT_PATH", str(fake))
    p = resolve_classification_model_path()
    assert p.resolve() == fake.resolve()
    monkeypatch.delenv("ML_VIT_PATH", raising=False)
