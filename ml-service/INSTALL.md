# ML Service – Instalación

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
