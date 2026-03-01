# Modelo Vision Transformer (ViT)

El archivo `vision_transformer_moda_modelo.keras` es el modelo ViT entrenado para clasificación de prendas. **Debe estar en esta carpeta** (`ml-service/`) y pesar ~1 GB (no un puntero de Git LFS de 135 bytes).

## Cómo obtener el archivo real

La ruta que tenías en Downloads (`fashion_ai-vision_transformer_moda_modelo.keras/ml-service/vision_transformer_moda_modelo.keras`) es un **puntero de Git LFS** (135 bytes), no el modelo. Para usar ese modelo:

1. **Si tienes el repo original en Git** (con Git LFS instalado):
   ```bash
   cd /ruta/al/repo/original
   git lfs pull
   cp ml-service/vision_transformer_moda_modelo.keras /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/
   ```
2. **Si tienes el archivo real** (~1 GB) en otro sitio (Escritorio, otra carpeta): cópialo a:
   ```text
   /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/vision_transformer_moda_modelo.keras
   ```

Sin ese archivo, el servicio arranca solo con CNN; el frontend seguirá ofreciendo "Classify (ViT)" pero el backend responderá que el ViT no está disponible.

El servicio preprocesa la imagen para ViT así: redimensionado a 224×224 (o al tamaño que indique el modelo), **normalización [0,1]** (píxeles/255). Si tu modelo fue entrenado con otro preprocesado (p. ej. ImageNet mean/std), coméntalo para ajustarlo.

## Entorno actual (Python 3.11)

El **venv** del ml-service está configurado con **Python 3.11** para poder instalar `tensorflow-text` en macOS (Intel). Con eso se puede instalar **keras-hub** y el modelo ViT debería cargar al arrancar el servicio.

- `tensorflow-text==2.16.1` tiene wheel para macOS x86_64 + Python 3.11.
- Si reinstalas desde cero: `python3.11 -m venv venv`, `source venv/bin/activate`, `pip install -r requirements.txt`.

## Si ViT no carga

- En **Apple Silicon (M1/M2)** puede no haber wheel de tensorflow-text; en ese caso usar solo CNN o buscar un wheel de terceros.
- El frontend hace fallback automático a CNN si ViT no está disponible.
