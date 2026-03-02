"""
Entrenamiento del modelo Vision Transformer (ViT) para clasificación de prendas.
Guarda el modelo y todas las métricas en ml-service para que el servicio use el modelo más reciente.

Requisito: Python 3.11 (./run_train_vit.sh lo usa por defecto).

Dataset: por defecto image_dataset_from_directory (tf.data).
  Si en Mac Intel se queda colgado: USE_IMAGE_DATAGEN=1 ./run_train_vit.sh

En Mac Intel sin GPU el primer batch puede tardar 15-30 min (compilación del grafo). Luego avanza.
"""
from __future__ import annotations

import sys
# Exigir Python 3.11 para evitar incompatibilidades (tf, keras-hub, numpy)
if sys.version_info[:2] != (3, 11):
    sys.exit(
        f"Se requiere Python 3.11. Tienes {sys.version_info.major}.{sys.version_info.minor}. "
        "Ejecuta con: ./run_train_vit.sh (usa el venv con python3.11) o python3.11 train_vit.py"
    )
print(f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", flush=True)

# Salida sin buffer para ver prints al momento (sobre todo en entrenamiento)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

import json
import os
import sys
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")  # backend sin ventana para guardar figuras
import matplotlib.pyplot as plt
import tensorflow as tf
import keras
import keras_hub
from tensorflow.keras.utils import image_dataset_from_directory
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    precision_recall_fscore_support,
    accuracy_score,
)

# --- Semilla y determinismo ---
SEED = 42
tf.keras.utils.set_random_seed(SEED)
try:
    tf.config.experimental.enable_op_determinism()
except Exception:
    pass

# --- Directorio del script = ml-service (donde se guarda todo) ---
ML_SERVICE_DIR = Path(__file__).resolve().parent


def get_dataset_path() -> Path:
    """Obtiene DATASET_PATH desde env, backend/.env o dataset_path.env.example."""
    path = os.environ.get("DATASET_PATH", "").strip()
    if path and Path(path).is_dir():
        return Path(path)
    # Intentar leer backend/.env
    backend_env = ML_SERVICE_DIR.parent / "backend" / ".env"
    if backend_env.exists():
        with open(backend_env, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATASET_PATH="):
                    p = line.split("=", 1)[1].strip().strip("'\"")
                    if p and Path(p).is_dir():
                        return Path(p)
    # Ejemplo en ml-service
    example = ML_SERVICE_DIR / "dataset_path.env.example"
    if example.exists():
        with open(example, encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("DATASET_PATH="):
                    p = line.split("=", 1)[1].strip().strip("'\"")
                    if p:
                        path = p
                        break
    if path:
        return Path(path)
    raise SystemExit(
        "DATASET_PATH no definido. Exporta la variable o configúrala en backend/.env.\n"
        "Ejemplo: export DATASET_PATH=/Users/alvaromartin-pena/Desktop/fashion_dataset"
    )


class Config:
    """Configuración del entrenamiento ViT."""
    def __init__(self):
        self.dataset_path = get_dataset_path()
        self.train_dir = self.dataset_path / "train_df"
        self.val_dir = self.dataset_path / "val_df"
        self.test_dir = self.dataset_path / "test_df"

        self.img_size = (224, 224)
        self.batch_size = 32
        self.num_classes = 10

        self.epochs = 10
        self.lr = 1e-4
        self.vit_preset = "vit_base_patch16_224_imagenet21k"

        # Salida: todo en ml-service
        self.out_dir = ML_SERVICE_DIR
        self.model_path = self.out_dir / "vision_transformer_moda_modelo.keras"
        self.cm_path = self.out_dir / "confusion_matrix_vit.png"
        self.curves_path = self.out_dir / "training_curves_vit.png"
        self.metrics_path = self.out_dir / "model_metrics_vit.json"


def build_datasets(cfg: Config):
    """Construye train/val/test con image_dataset_from_directory."""
    if not cfg.train_dir.is_dir():
        raise SystemExit(f"No existe el directorio de entrenamiento: {cfg.train_dir}")

    train_ds = image_dataset_from_directory(
        cfg.train_dir,
        image_size=cfg.img_size,
        batch_size=cfg.batch_size,
        label_mode="int",
        shuffle=True,
        seed=SEED,
    )
    class_names = sorted(train_ds.class_names)
    num_classes = len(class_names)
    if num_classes != cfg.num_classes:
        print(f"Advertencia: se esperaban {cfg.num_classes} clases, se encontraron {num_classes}. Ajustando.")
        cfg.num_classes = num_classes

    val_ds = None
    if cfg.val_dir.is_dir():
        val_ds = image_dataset_from_directory(
            cfg.val_dir,
            image_size=cfg.img_size,
            batch_size=cfg.batch_size,
            label_mode="int",
            shuffle=False,
        )
        if sorted(val_ds.class_names) != class_names:
            print("Advertencia: val_df tiene clases distintas a train_df.")

    test_ds = None
    if cfg.test_dir.is_dir():
        test_ds = image_dataset_from_directory(
            cfg.test_dir,
            image_size=cfg.img_size,
            batch_size=cfg.batch_size,
            label_mode="int",
            shuffle=False,
        )

    # Normalizar [0,255] -> [0,1] para coincidir con app.py
    autotune = tf.data.AUTOTUNE
    def normalize_img(x, y):
        return tf.cast(x, tf.float32) / 255.0, y

    train_ds = train_ds.map(normalize_img, num_parallel_calls=autotune).prefetch(autotune)
    if val_ds is not None:
        val_ds = val_ds.map(normalize_img, num_parallel_calls=autotune).prefetch(autotune)
    if test_ds is not None:
        test_ds = test_ds.map(normalize_img, num_parallel_calls=autotune).prefetch(autotune)

    return train_ds, val_ds, test_ds, class_names


def build_generators(cfg: Config):
    """Alternativa con ImageDataGenerator: suele ir bien en Mac Intel si tf.data se cuelga. USE_IMAGE_DATAGEN=1."""
    if not cfg.train_dir.is_dir():
        raise SystemExit(f"No existe el directorio de entrenamiento: {cfg.train_dir}")
    class_names = sorted([d.name for d in cfg.train_dir.iterdir() if d.is_dir()])
    cfg.num_classes = len(class_names)
    idg = ImageDataGenerator(rescale=1.0 / 255.0)
    train_gen = idg.flow_from_directory(cfg.train_dir, target_size=cfg.img_size, batch_size=cfg.batch_size, class_mode="sparse", shuffle=True, seed=SEED)
    val_gen = idg.flow_from_directory(cfg.val_dir, target_size=cfg.img_size, batch_size=cfg.batch_size, class_mode="sparse", shuffle=False) if cfg.val_dir.is_dir() else None
    test_gen = idg.flow_from_directory(cfg.test_dir, target_size=cfg.img_size, batch_size=cfg.batch_size, class_mode="sparse", shuffle=False) if cfg.test_dir.is_dir() else None
    return train_gen, val_gen, test_gen, class_names


def main():
    # Mostrar si TensorFlow usa GPU/Metal o solo CPU (en Mac sin metal = solo CPU = muy lento).
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        print("TensorFlow: GPU detectada →", [g.name for g in gpus], flush=True)
    else:
        print("TensorFlow: no hay GPU → solo CPU (el primer batch y el entrenamiento irán lentos).", flush=True)
        if sys.platform == "darwin":
            print("  Mac M1/M2/M3: para usar Metal (GPU), instala: pip install tensorflow-macos tensorflow-metal", flush=True)
    print("", flush=True)

    cfg = Config()
    print("Dataset path:", cfg.dataset_path)
    print("Train dir:", cfg.train_dir)
    print("Salida (modelo + métricas):", cfg.out_dir)

    use_generators = os.environ.get("USE_IMAGE_DATAGEN", "").strip().lower() in ("1", "true", "yes")
    if use_generators:
        print("Usando ImageDataGenerator (USE_IMAGE_DATAGEN=1).", flush=True)
        train_data, val_data, test_data, class_names = build_generators(cfg)
        print("Clases:", class_names)
        print("Muestras train:", train_data.samples, "| batches/epoch:", len(train_data), flush=True)
    else:
        print("Usando image_dataset_from_directory (tf.data).", flush=True)
        train_data, val_data, test_data, class_names = build_datasets(cfg)
        print("Clases:", class_names)

    # Modelo ViT desde preset
    print("Cargando ViT preset:", cfg.vit_preset)
    model = keras_hub.models.ViTImageClassifier.from_preset(
        cfg.vit_preset,
        num_classes=cfg.num_classes,
    )

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=cfg.lr),
        loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=["accuracy"],
    )

    # Modo rápido: solo 50 batches/epoch, 2 épocas.
    quick = os.environ.get("TRAIN_QUICK", "").strip().lower() in ("1", "true", "yes")

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy" if val_data else "accuracy",
            patience=4,
            restore_best_weights=True,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss" if val_data else "loss",
            factor=0.5,
            patience=2,
            min_lr=1e-6,
        ),
        keras.callbacks.ModelCheckpoint(
            str(cfg.model_path),
            monitor="val_accuracy" if val_data else "accuracy",
            save_best_only=True,
            save_weights_only=False,
        ),
        keras.callbacks.LambdaCallback(
            on_train_begin=lambda _: print("Entrenamiento iniciado.\n", flush=True),
            on_epoch_begin=lambda epoch, _: print(f"\n--- Epoch {epoch + 1}/{cfg.epochs} ---", flush=True),
            on_batch_end=lambda batch, logs: print(f"  batch {batch + 1} ...", flush=True) if (batch + 1) % 10 == 0 else None,
        ),
    ]

    if use_generators:
        steps_per_epoch = len(train_data)
        validation_steps = len(val_data) if val_data else None
    else:
        steps_per_epoch = None
        validation_steps = None
    if quick:
        steps_per_epoch = min(50, steps_per_epoch) if steps_per_epoch else 50
        validation_steps = min(20, validation_steps) if validation_steps else 20
        cfg.epochs = 2
        print("Modo rápido (TRAIN_QUICK=1): 50 steps/epoch, 2 épocas.", flush=True)

    n_batches = (42000 + cfg.batch_size - 1) // cfg.batch_size
    print(f"Entrenando: {steps_per_epoch or n_batches} batches por época.", flush=True)
    print("Iniciando fit()...\n", flush=True)

    history = model.fit(
        train_data,
        validation_data=val_data,
        epochs=cfg.epochs,
        callbacks=callbacks,
        verbose=1,
        steps_per_epoch=steps_per_epoch,
        validation_steps=validation_steps,
    )

    # Guardar el modelo final (mejor pesos ya restaurados por EarlyStopping)
    model.save(cfg.model_path)
    print("Modelo guardado en:", cfg.model_path)

    # Evaluación y métricas
    if test_data is not None:
        if use_generators:
            print("Evaluando en test...", flush=True)
            test_loss, test_acc = model.evaluate(test_data, steps=len(test_data), verbose=1)
            test_data.reset()
            y_true_list, y_pred_list = [], []
            for _ in range(len(test_data)):
                x_batch, y_batch = next(test_data)
                y_true_list.append(y_batch)
                logits = model.predict(x_batch, verbose=0)
                y_pred_list.append(np.argmax(logits, axis=1))
            y_true = np.concatenate(y_true_list, axis=0)
            y_pred = np.concatenate(y_pred_list, axis=0)
        else:
            test_loss, test_acc = model.evaluate(test_data, verbose=1)
            y_true = np.concatenate([y.numpy() for _, y in test_data], axis=0)
            logits = model.predict(test_data, verbose=0)
            y_pred = np.argmax(logits, axis=1)

        print(f"Test accuracy: {test_acc:.4f} | Test loss: {test_loss:.4f}")

        print("\nClassification report:")
        print(classification_report(y_true, y_pred, target_names=class_names, digits=4))

        cm = confusion_matrix(y_true, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(
            y_true, y_pred, average=None, zero_division=0
        )
        acc = accuracy_score(y_true, y_pred)
        macro_p = np.mean(precision)
        macro_r = np.mean(recall)
        macro_f1 = np.mean(f1)
        weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average="weighted", zero_division=0
        )

        # Guardar confusion matrix
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)
        plt.figure(figsize=(10, 10))
        disp.plot(xticks_rotation=45)
        plt.title("Confusion Matrix (ViT)")
        plt.tight_layout()
        plt.savefig(cfg.cm_path, dpi=150)
        plt.close()
        print("Confusion matrix guardada en:", cfg.cm_path)

        # model_metrics_vit.json (mismo formato que usa app.py /metrics-vit)
        metrics_list = []
        for i, name in enumerate(class_names):
            metrics_list.append({
                "class": name,
                "precision": float(precision[i]),
                "recall": float(recall[i]),
                "f1_score": float(f1[i]),
                "support": int(support[i]),
            })
        metrics_payload = {
            "model_type": "Vision Transformer (ViT)",
            "metrics": metrics_list,
            "overall": {
                "accuracy": float(acc),
                "macro_avg_precision": float(macro_p),
                "macro_avg_recall": float(macro_r),
                "macro_avg_f1": float(macro_f1),
                "weighted_avg_precision": float(weighted_p),
                "weighted_avg_recall": float(weighted_r),
                "weighted_avg_f1": float(weighted_f1),
                "total_support": int(support.sum()),
            },
        }
        with open(cfg.metrics_path, "w", encoding="utf-8") as f:
            json.dump(metrics_payload, f, indent=2)
        print("Métricas guardadas en:", cfg.metrics_path)
    else:
        cm = None
        print("No hay test_df; se omiten métricas y confusion matrix.")

    # Curvas de entrenamiento
    acc = history.history.get("accuracy", [])
    val_acc = history.history.get("val_accuracy", [])
    loss_hist = history.history.get("loss", [])
    val_loss = history.history.get("val_loss", [])

    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(acc, label="train_acc")
    if val_acc:
        plt.plot(val_acc, label="val_acc")
    plt.title("Accuracy: Train vs Val")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(loss_hist, label="train_loss")
    if val_loss:
        plt.plot(val_loss, label="val_loss")
    plt.title("Loss: Train vs Val")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.tight_layout()
    plt.savefig(cfg.curves_path, dpi=150)
    plt.close()
    print("Curvas de entrenamiento guardadas en:", cfg.curves_path)

    print("\nListo. Reinicia el ML service (./stop-all.sh && ./start-all.sh) para usar el nuevo ViT.")


if __name__ == "__main__":
    main()
