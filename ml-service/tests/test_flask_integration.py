"""Integration tests: Flask client + stubbed model (IT-B1)."""

import pytest

from fashion_ml import flask_app as fa


@pytest.fixture
def flask_client(monkeypatch):
    class _Models:
        vit = object()

    monkeypatch.setattr(fa, "models", _Models())
    return fa.app.test_client()


def test_health_returns_ok(flask_client):
    resp = flask_client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "OK"
    assert "vit_model_loaded" in data


def test_root_lists_health_path(flask_client):
    resp = flask_client.get("/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get("health") == "/health"
