"""TensorFlow / Keras model loading with optional GPU memory growth and thread-safe predict."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from fashion_ml.image_ops import logits_to_probs, preprocess_image
from fashion_ml.labels import CLASS_NAMES, CLASS_TO_TIPO, TIPO_POR_INDICE


def configure_tensorflow_runtime() -> None:
    """Reduce GPU OOM risk; no-op on CPU-only."""
    try:
        import tensorflow as tf

        try:
            for g in tf.config.list_physical_devices("GPU"):
                tf.config.experimental.set_memory_growth(g, True)
        except Exception:
            pass
    except Exception:
        pass


class MLModels:
    """Holds CNN + ViT weights and metadata. Lazy full load via load_all()."""

    __slots__ = (
        "_lock",
        "vit_input_size",
        "cnn",
        "vit",
        "keras_hub_available",
        "load_error_cnn",
        "load_error_vit",
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.vit_input_size = 224
        self.cnn: Any = None
        self.vit: Any = None
        self.keras_hub_available = False
        self.load_error_cnn: str | None = None
        self.load_error_vit: str | None = None

    def _import_keras_hub_custom_objects(self) -> dict:
        vit_custom_objects: dict = {}
        try:
            import importlib

            import keras_hub
            self.keras_hub_available = True

            for mod_name in [
                "keras_hub.models.vit.vit_image_classifier",
                "keras_hub.models.vit.vit_backbone",
                "keras_hub.models.vit.vit_image_classifier_preprocessor",
                "keras_hub.models.vit.vit_image_converter",
                "keras_hub.src.models.vit.vit_image_classifier",
                "keras_hub.src.models.vit.vit_backbone",
            ]:
                try:
                    importlib.import_module(mod_name)
                except Exception:
                    pass
            for mod in [getattr(keras_hub, "models", None), getattr(keras_hub, "layers", None)]:
                if mod is None:
                    continue
                for name in dir(mod):
                    if name.startswith("_"):
                        continue
                    obj = getattr(mod, name)
                    if isinstance(obj, type):
                        vit_custom_objects[name] = obj
                        vit_custom_objects[f"keras_hub>{name}"] = obj
            vit_mod = getattr(getattr(keras_hub, "models", None), "vit", None)
            if vit_mod is not None:
                for name in dir(vit_mod):
                    if name.startswith("_"):
                        continue
                    obj = getattr(vit_mod, name)
                    if isinstance(obj, type):
                        vit_custom_objects[name] = obj
                        vit_custom_objects[f"keras_hub>{name}"] = obj
        except ImportError:
            self.keras_hub_available = False
            return {}
        return vit_custom_objects

    def load_cnn(self, cnn_path: Path) -> None:
        import tensorflow as tf

        self.load_error_cnn = None
        if not cnn_path.is_file():
            self.cnn = None
            return
        try:
            self.cnn = tf.keras.models.load_model(str(cnn_path), compile=False)
            print(f"✅ CNN loaded ({cnn_path.stat().st_size / (1024*1024):.1f} MB)", flush=True)
        except Exception as e1:
            try:
                self.cnn = tf.keras.models.load_model(str(cnn_path))
                print(f"✅ CNN loaded ({cnn_path.stat().st_size / (1024*1024):.1f} MB)", flush=True)
            except Exception as e2:
                self.load_error_cnn = str(e2)
                self.cnn = None
                print(f"CNN load error: {e1}", flush=True)

    def load_vit(self, vit_path: Path) -> None:
        import tensorflow as tf

        self.load_error_vit = None
        if not vit_path.is_file():
            self.vit = None
            print(f"❌ ViT not found: {vit_path}", flush=True)
            return

        vit_custom_objects = self._import_keras_hub_custom_objects()
        vit_loaded = False
        vit_last_error: Exception | None = None
        self.vit = None

        try:
            self.vit = tf.keras.models.load_model(str(vit_path), compile=False, safe_mode=False)
            if self.vit is not None:
                vit_loaded = True
        except (TypeError, Exception) as e0:
            vit_last_error = e0
            self.vit = None

        if not vit_loaded and vit_custom_objects:
            try:
                self.vit = tf.keras.models.load_model(
                    str(vit_path), compile=False, custom_objects=vit_custom_objects
                )
                vit_loaded = True
            except Exception as e2:
                vit_last_error = e2
                self.vit = None

        if not vit_loaded:
            try:
                import keras as k3

                try:
                    self.vit = k3.models.load_model(str(vit_path), compile=False, safe_mode=False)
                except TypeError:
                    self.vit = k3.models.load_model(str(vit_path), compile=False)
                if self.vit is not None:
                    vit_loaded = True
            except Exception as e1:
                vit_last_error = e1

        if not vit_loaded:
            try:
                self.vit = tf.keras.models.load_model(str(vit_path), compile=False)
                vit_loaded = True
            except (TypeError, Exception) as e3:
                vit_last_error = e3
                self.vit = None

        if vit_loaded and self.vit is not None:
            print(f"✅ ViT loaded ({vit_path.stat().st_size / (1024*1024):.1f} MB)", flush=True)
            if self.vit.input_shape and len(self.vit.input_shape) >= 3:
                detected_size = self.vit.input_shape[1]
                if detected_size and detected_size > 0:
                    self.vit_input_size = int(detected_size)
        else:
            self.vit = None
            err_msg = str(vit_last_error) if vit_last_error else "unknown"
            self.load_error_vit = err_msg[:500]
            print(f"❌ ViT did not load. Error: {err_msg[:200]}", flush=True)
            if not self.keras_hub_available:
                print("   Tip: pip install keras-hub (si tu .keras lo necesita)", flush=True)

    def load_all(self, cnn_path: Path, vit_path: Path) -> None:
        configure_tensorflow_runtime()
        print(f"   Loading CNN (optional): {cnn_path}", flush=True)
        self.load_cnn(cnn_path)
        if self.cnn is None:
            print("   CNN not found (ok): running ViT-only mode.", flush=True)

        print(f"   Loading ViT: {vit_path}", flush=True)
        self.load_vit(vit_path)

    def predict_vit(self, image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        """Returns (probs, logits) length 10."""
        if self.vit is None:
            raise RuntimeError("ViT model not loaded")
        arr = preprocess_image(image, target_size=self.vit_input_size, normalize=False)
        with self._lock:
            pred = self.vit.predict(arr, verbose=0)
        out = pred[0] if isinstance(pred, (list, tuple)) else pred
        logits = np.asarray(out).ravel()
        if len(logits) != 10:
            logits = np.asarray(pred).ravel()[:10]
        if len(logits) < 10:
            z = np.zeros(10, dtype=np.float64)
            z[0] = 1.0
            logits = z
        probs = logits_to_probs(logits)
        return probs, logits

    def predict_cnn(self, image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        if self.cnn is None:
            raise RuntimeError("CNN model not loaded")
        arr = preprocess_image(image, target_size=224, normalize=True)
        with self._lock:
            pred = self.cnn.predict(arr, verbose=0)
        out = pred[0] if isinstance(pred, (list, tuple)) else pred
        logits = np.asarray(out).ravel()
        if len(logits) != 10:
            logits = np.asarray(pred).ravel()[:10]
        if len(logits) < 10:
            z = np.zeros(10, dtype=np.float64)
            z[0] = 1.0
            logits = z
        probs = logits_to_probs(logits)
        return probs, logits


# Singleton used by Flask / FastAPI
models = MLModels()


def build_classification_response(
    probs: np.ndarray,
    color: str,
    backend: str,
    model_basename: str,
) -> dict:
    clase = int(np.argmax(probs))
    confianza = float(probs[clase])
    top3_indices = np.argsort(probs)[-3:][::-1]
    top3_info = []
    for idx in top3_indices:
        if idx < len(CLASS_NAMES):
            top3_info.append(
                {
                    "clase_nombre": CLASS_NAMES[idx],
                    "confianza": float(probs[idx]),
                    "tipo": CLASS_TO_TIPO.get(CLASS_NAMES[idx], "desconocido"),
                }
            )
    clase_nombre = CLASS_NAMES[clase] if clase < len(CLASS_NAMES) else "desconocido"
    tipo = CLASS_TO_TIPO.get(clase_nombre, TIPO_POR_INDICE.get(clase, "desconocido"))
    return {
        "clase": int(clase),
        "clase_nombre": clase_nombre,
        "tipo": tipo,
        "confianza": confianza,
        "color": color,
        "top3": top3_info,
        "model": backend,
        "model_file": model_basename,
    }
