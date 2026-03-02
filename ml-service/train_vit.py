from pathlib import Path
import sys
import os

# Para que salga la barra de progreso en todos los pasos, ejecuta siempre:
#   conda activate vision_transfomers_moda
#   python -u train_vit.py
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

# Evita bloqueos a 0% CPU en Mac: limitar hilos antes de importar TensorFlow
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")

# En terminal: conda activate vision_transfomers_moda && python -u train_vit.py
# Si se queda en step 1 más de 3 min: QUICK_TRAIN=1 python -u train_vit.py (prueba con 20 steps/epoch, 2 epochs).

# Para Jupyter: backend sin ventana y que no se cuelgue
import matplotlib
matplotlib.use("Agg")
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
import keras
import keras_hub

from tensorflow.keras.utils import image_dataset_from_directory
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay

# Comprobar qué Python/TF usas (terminal vs Jupyter)
print("Python:", sys.executable, flush=True)
print("TensorFlow:", tf.__version__, flush=True)

SEED = 42
tf.keras.utils.set_random_seed(SEED)
# Determinism can cause threading issues on some Macs; disable if you see 0% CPU hang.
try:
    if os.environ.get("TF_DETERMINISTIC", "0") != "0":
        tf.config.experimental.enable_op_determinism()
except Exception:
    pass


class Config:
    TRAIN_DIR = Path("/Users/alvaromartin-pena/Desktop/Proyectos/fashion_dataset/train_df")
    VAL_DIR   = Path("/Users/alvaromartin-pena/Desktop/Proyectos/fashion_dataset/val_df")
    TEST_DIR  = Path("/Users/alvaromartin-pena/Desktop/Proyectos/fashion_dataset/test_df")

    IMG_SIZE = (224, 224)
    BATCH_SIZE = 32  # 16 es más seguro en memoria; 32 suele ser más rápido por epoch
    NUM_CLASSES = 10

    EPOCHS = 5
    LR = 1e-4

    VIT_PRESET = "vit_base_patch16_224_imagenet21k"
    OUT_DIR = Path.home() / "Desktop" / "vit_fashion_outputs"


Config.OUT_DIR.mkdir(parents=True, exist_ok=True)


train_ds = image_dataset_from_directory(
    Config.TRAIN_DIR,
    image_size=Config.IMG_SIZE,
    batch_size=Config.BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED
)

val_ds = image_dataset_from_directory(
    Config.VAL_DIR,
    image_size=Config.IMG_SIZE,
    batch_size=Config.BATCH_SIZE,
    label_mode="int",
    shuffle=False
)

test_ds = image_dataset_from_directory(
    Config.TEST_DIR,
    image_size=Config.IMG_SIZE,
    batch_size=Config.BATCH_SIZE,
    label_mode="int",
    shuffle=False
)

class_names = train_ds.class_names

# Dataset en un solo hilo para evitar bloqueos en Mac.
_opts = tf.data.Options()
try:
    _opts.threading.private_threadpool_size = 1
    _opts.threading.max_intra_op_parallelism = 1
except AttributeError:
    try:
        _opts.experimental_threading.private_threadpool_size = 1
        _opts.experimental_threading.max_intra_op_parallelism = 1
    except AttributeError:
        _opts = None
if _opts is not None:
    train_ds = train_ds.with_options(_opts)
    val_ds = val_ds.with_options(_opts)
    test_ds = test_ds.with_options(_opts)

# Modo rápido: pocos batches. QUICK_TRAIN=1 → 20 steps/epoch, 2 epochs.
# Prueba mínima (pasa batch 1 y 2): TEST_BATCHES=3 → 3 steps, 1 epoch.
_test_batches = os.environ.get("TEST_BATCHES", "").strip()
QUICK_TRAIN = os.environ.get("QUICK_TRAIN", "").strip().lower() in ("1", "true", "yes")
if _test_batches.isdigit():
    n_test = max(2, int(_test_batches))
    train_ds = train_ds.take(n_test + 5)
    val_ds = val_ds.take(5)
    STEPS_PER_EPOCH = n_test
    VALIDATION_STEPS = 2
    N_EPOCHS = 1
    print(f"TEST_BATCHES={n_test}: solo {n_test} steps, 1 epoch (comprobar que pasa batch 1 y 2).", flush=True)
elif QUICK_TRAIN:
    train_ds = train_ds.take(50)
    val_ds = val_ds.take(20)
    STEPS_PER_EPOCH = 20
    VALIDATION_STEPS = 10
    N_EPOCHS = 2
    print("QUICK_TRAIN: 20 steps/epoch, 2 epochs (~20–40 min).", flush=True)
else:
    STEPS_PER_EPOCH = (42003 + Config.BATCH_SIZE - 1) // Config.BATCH_SIZE  # ~1312 con batch 32
    VALIDATION_STEPS = None
    N_EPOCHS = Config.EPOCHS


model = keras_hub.models.ViTImageClassifier.from_preset(
    Config.VIT_PRESET,
    num_classes=Config.NUM_CLASSES
)

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=Config.LR),
    loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=["accuracy"]
)

# Estado para la barra de progreso visible en cualquier terminal
_current_epoch = [1]  # lista para poder modificar en callback

def _progress_step(batch_index):
    step = batch_index + 1
    if step <= 3 or step % 5 == 0 or step == STEPS_PER_EPOCH:
        sys.stderr.write(f"  step {step}/{STEPS_PER_EPOCH}\n")
        sys.stderr.flush()

def _progress_bar(epoch, batch, total, loss=None, acc=None):
    """Barra de progreso que siempre se ve (stdout, flush)."""
    n = 20
    p = (batch + 1) / total if total else 0
    filled = int(n * p)
    bar = "=" * filled + ">" * (1 if filled < n else 0) + " " * (n - filled - 1)
    loss_s = f" - loss: {loss:.4f}" if loss is not None else ""
    acc_s = f" - acc: {acc:.4f}" if acc is not None else ""
    line = f"\rEpoch {epoch}/{N_EPOCHS} [{bar}] {batch + 1}/{total}{loss_s}{acc_s}   "
    print(line, end="", flush=True)
    if batch + 1 == total:
        print(flush=True)  # nueva línea al acabar el epoch

callbacks = [
    keras.callbacks.EarlyStopping(
        monitor="val_accuracy",
        patience=3,
        restore_best_weights=True
    ),
    keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=2,
        min_lr=1e-6
    ),
    keras.callbacks.ModelCheckpoint(
        filepath=str(Config.OUT_DIR / "best_model.keras"),
        monitor="val_accuracy",
        save_best_only=True,
        save_weights_only=False
    ),
    keras.callbacks.LambdaCallback(
        on_epoch_begin=lambda epoch, logs: _current_epoch.__setitem__(0, epoch + 1)
    ),
    keras.callbacks.LambdaCallback(
        on_epoch_end=lambda epoch, logs: print(
            f"  Epoch {epoch + 1}/{N_EPOCHS} terminado - val_loss: {logs.get('val_loss', 0):.4f} - val_accuracy: {logs.get('val_accuracy', 0):.4f}",
            flush=True
        )
    ),
    keras.callbacks.LambdaCallback(
        on_train_batch_end=lambda batch, logs: (
            _progress_step(batch),
            _progress_bar(
                _current_epoch[0], batch, STEPS_PER_EPOCH,
                logs.get("loss") if logs else None,
                logs.get("accuracy") if logs else None
            )
        )
    )
]

print("Barra de progreso: verás Epoch X [=====>] step/total bajo esta línea.", flush=True)
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=N_EPOCHS,
    steps_per_epoch=STEPS_PER_EPOCH,
    validation_steps=VALIDATION_STEPS,
    callbacks=callbacks,
    verbose=0  # Usamos nuestra barra; verbose=1 pisaba con la de Keras
)


test_loss, test_acc = model.evaluate(test_ds, verbose=1)

y_true = np.concatenate([y.numpy() for _, y in test_ds], axis=0)
logits = model.predict(test_ds, verbose=1)
y_pred = np.argmax(logits, axis=1)

report = classification_report(y_true, y_pred, target_names=class_names, digits=4)
cm = confusion_matrix(y_true, y_pred)


model_final_path = Config.OUT_DIR / "vision_transformer_moda_modelo.keras"
model.save(model_final_path)

report_path = Config.OUT_DIR / "classification_report.txt"
report_path.write_text(
    f"Test accuracy: {test_acc:.4f}\n"
    f"Test loss: {test_loss:.4f}\n\n"
    f"{report}"
)

cm_path = Config.OUT_DIR / "confusion_matrix_vit.png"
fig_cm, ax_cm = plt.subplots(figsize=(10, 10))
ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names).plot(
    ax=ax_cm, xticks_rotation=45
)
ax_cm.set_title("Confusion Matrix (ViT)")
fig_cm.tight_layout()
fig_cm.savefig(cm_path, dpi=300)
plt.close(fig_cm)


curves_path = Config.OUT_DIR / "training_curves_vit.png"

acc = history.history.get("accuracy", [])
val_acc = history.history.get("val_accuracy", [])
loss = history.history.get("loss", [])
val_loss = history.history.get("val_loss", [])

fig, axes = plt.subplots(1, 2, figsize=(12, 5))

axes[0].plot(acc, label="train_acc")
axes[0].plot(val_acc, label="val_acc")
axes[0].set_title("Accuracy")
axes[0].legend()

axes[1].plot(loss, label="train_loss")
axes[1].plot(val_loss, label="val_loss")
axes[1].set_title("Loss")
axes[1].legend()

fig.tight_layout()
fig.savefig(curves_path, dpi=300)
plt.close(fig)


summary_path = Config.OUT_DIR / "run_summary.txt"
summary_path.write_text(
    f"VIT_PRESET: {Config.VIT_PRESET}\n"
    f"IMG_SIZE: {Config.IMG_SIZE}\n"
    f"BATCH_SIZE: {Config.BATCH_SIZE}\n"
    f"EPOCHS: {Config.EPOCHS}\n"
    f"LR: {Config.LR}\n\n"
    f"Test accuracy: {test_acc:.4f}\n"
    f"Test loss: {test_loss:.4f}\n"
)

print(f"Outputs: {Config.OUT_DIR}")
print(f"Saved model: {model_final_path}")
print(f"Saved best model: {Config.OUT_DIR / 'best_model.keras'}")
print(f"Saved report: {report_path}")
print(f"Saved confusion matrix: {cm_path}")
print(f"Saved curves: {curves_path}")
print(f"Saved summary: {summary_path}")
