"""Flask application — same routes as legacy app.py (backward compatible)."""

from __future__ import annotations

import io
import json
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image

from fashion_ml.config import CNN_MODEL_PATH, MAX_UPLOAD_BYTES, ML_SERVICE_ROOT, VIT_MODEL_PATH
from fashion_ml.image_ops import allowed_file, detect_color
from fashion_ml.model_loader import build_classification_response, models

UPLOAD_FOLDER = "temp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)


def _send_static_file(filename: str, mimetype: str | None = None):
    filepath = os.path.join(str(ML_SERVICE_ROOT), filename)
    if not os.path.exists(filepath):
        return None
    return send_file(filepath, mimetype=mimetype, as_attachment=False)


@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "Fashion AI ML API", "health": "/health", "classify_vit": "POST /classify-vit"})


@app.route("/confusion-matrix", methods=["GET"])
def serve_confusion_matrix():
    r = _send_static_file("confusion_matrix.png", "image/png")
    return r if r is not None else (jsonify({"error": "Not found"}), 404)


@app.route("/confusion-matrix-vit", methods=["GET"])
def serve_confusion_matrix_vit():
    r = _send_static_file("confusion_matrix_vit.png", "image/png")
    return r if r is not None else (jsonify({"error": "Not found"}), 404)


@app.route("/metrics", methods=["GET"])
def serve_metrics():
    filepath = os.path.join(str(ML_SERVICE_ROOT), "model_metrics.json")
    if not os.path.exists(filepath):
        return jsonify({"error": "Not found"}), 404
    with open(filepath, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/metrics-vit", methods=["GET"])
def serve_metrics_vit():
    filepath = os.path.join(str(ML_SERVICE_ROOT), "model_metrics_vit.json")
    if not os.path.exists(filepath):
        return jsonify({"error": "Not found"}), 404
    with open(filepath, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/data-audit", methods=["GET"])
def serve_data_audit():
    r = _send_static_file("data_audit.png", "image/png")
    return r if r is not None else (jsonify({"error": "Not found"}), 404)


@app.route("/training-curves-vit", methods=["GET"])
def serve_training_curves_vit():
    r = _send_static_file("training_curves_vit.png", "image/png")
    return r if r is not None else (jsonify({"error": "Not found"}), 404)


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "OK",
            "model_loaded": models.cnn is not None,
            "model_file_exists": CNN_MODEL_PATH.is_file(),
            "model_path": str(CNN_MODEL_PATH.resolve()) if CNN_MODEL_PATH.is_file() else None,
            "vit_model_loaded": models.vit is not None,
            "vit_model_file_exists": VIT_MODEL_PATH.is_file(),
            "vit_model_path": str(VIT_MODEL_PATH.resolve()) if VIT_MODEL_PATH.is_file() else None,
            "classes_count": 10,
        }
    )


def _validate_upload():
    if "imagen" not in request.files:
        return None, (jsonify({"error": "No image provided"}), 400)
    file = request.files["imagen"]
    if file.filename == "" or not allowed_file(file.filename):
        return None, (jsonify({"error": "Invalid file"}), 400)
    raw = file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        return None, (jsonify({"error": "File too large"}), 413)
    return raw, None


@app.route("/classify", methods=["POST"])
def classify():
    try:
        raw, err = _validate_upload()
        if err:
            return err
        image = Image.open(io.BytesIO(raw))
        if image.mode != "RGB":
            image = image.convert("RGB")
        color = detect_color(image)
        if models.cnn is None:
            return jsonify({"error": "CNN model not available", "model_loaded": False}), 503
        probs, _ = models.predict_cnn(image)
        body = build_classification_response(
            probs, color, "cnn", Path(CNN_MODEL_PATH).name
        )
        return jsonify(body)
    except Exception as e:
        return jsonify({"error": f"Error processing image: {str(e)}"}), 500


@app.route("/classify-vit", methods=["POST"])
def classify_vit():
    try:
        raw, err = _validate_upload()
        if err:
            return err
        image = Image.open(io.BytesIO(raw))
        if image.mode != "RGB":
            image = image.convert("RGB")
        color = detect_color(image)
        if models.vit is None:
            return jsonify({"error": "Vision Transformer model not available", "model_loaded": False}), 503
        probs, _ = models.predict_vit(image)
        body = build_classification_response(
            probs, color, "vision_transformer", Path(VIT_MODEL_PATH).name
        )
        return jsonify(body)
    except Exception as e:
        return jsonify({"error": f"Error processing image: {str(e)}"}), 500
