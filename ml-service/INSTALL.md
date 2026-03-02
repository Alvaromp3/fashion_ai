# ML Service – Instalación

## Dataset para re-entrenar (CNN / ViT)

**Un solo path:** el mismo que usa el backend cuando guardas prendas (garments). Las fotos que subes y guardas con clasificación de alta confianza (≥ 80 %) se copian a `DATASET_PATH/train_df/Clase/`. El script de entrenamiento debe leer de esa misma ruta.

- **Backend** (`backend/.env`): `DATASET_PATH` — donde `prendas.js` escribe al guardar una prenda con buena confianza.
- **Train script:** usa el mismo `DATASET_PATH` (misma ruta que en `backend/.env`).

Ruta en tu Mac (tras organizar el Desktop):

```
/Users/alvaromartin-pena/Desktop/Proyectos/fashion_dataset
```

Estructura (la que usa el backend y debe usar el entrenamiento):
- `train_df/` — Ankle_boot, Bag, Coat, Dress, Pullover, Sandal, Shirt, Sneaker, T-shirt, Trouser (las fotos añadidas desde la app van aquí)
- `test_df/`, `val_df/` — opcionales para validación

En `train_model.py` (o el script que uses) define `DATASET_PATH` o `data_dir` con esa misma ruta. Los `class_names` en `app.py` deben coincidir con las carpetas de `train_df/`. Referencia: `ml-service/dataset_path.env.example` (mismo valor que en `backend/.env`).

**Re-entrenar ViT** (requiere **Python 3.11**; el script lo comprueba y `run_train_vit.sh` lo usa):

```bash
cd ml-service && ./run_train_vit.sh
```

Si se queda parado en "Epoch 1/10" o "Iniciando fit()..." en **Mac Intel sin GPU**, el primer batch puede tardar **15-30 min** (compilación del grafo). Alternativa:

```bash
cd ml-service && USE_IMAGE_DATAGEN=1 ./run_train_vit.sh
```

Si ves `ModuleNotFoundError: No module named 'numpy'`, el venv usa otro Python: `./run_train_vit.sh` ya usa `venv/bin/python3.11`.

El script guarda en `ml-service/`: `vision_transformer_moda_modelo.keras`, `confusion_matrix_vit.png`, `training_curves_vit.png`, `model_metrics_vit.json`. Tras entrenar, reinicia el servicio (`./stop-all.sh` y `./start-all.sh` desde la raíz) para usar el nuevo modelo.

---

## Error: "No matching distribution found for tensorflow"

Suele aparecer cuando la versión de **Python** no tiene wheels de TensorFlow publicados.

### Opción 1: Usar Python 3.11 (recomendado)

TensorFlow tiene buena compatibilidad con **Python 3.11**. En Mac:

```bash
# Con Homebrew
brew install python@3.11
cd ml-service
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

O con **pyenv**:

```bash
pyenv install 3.11.9
pyenv local 3.11.9
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Opción 2: Solo dependencias base (sin tensorflow-text)

Si falla con `requirements.txt`, prueba:

```bash
pip install -r requirements-base.txt
```

### Opción 3: Mac con Apple Silicon (M1/M2/M3)

Si quieres usar la GPU con Metal:

```bash
pip install tensorflow-macos==2.15.0 tensorflow-metal==1.1.0
pip install -r requirements-base.txt
```

Luego arranca todo con `./start-all.sh` desde la raíz del proyecto.

## Parar y arrancar todo (desde la raíz)

Los scripts `stop-all.sh` y `start-all.sh` están en la **raíz del repo**, no en `ml-service`. Si estás en `ml-service`:

```bash
cd ..           # ir a la raíz del proyecto (fashion_ai)
./stop-all.sh
./start-all.sh
```
