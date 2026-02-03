# Modelo Vision Transformer (ViT)

El archivo `vision_transformer_moda_modelo.keras` es el modelo ViT entrenado para clasificación de prendas.

## Entorno actual (Python 3.11)

El **venv** del ml-service está configurado con **Python 3.11** para poder instalar `tensorflow-text` en macOS (Intel). Con eso se puede instalar **keras-hub** y el modelo ViT debería cargar al arrancar el servicio.

- `tensorflow-text==2.16.1` tiene wheel para macOS x86_64 + Python 3.11.
- Si reinstalas desde cero: `python3.11 -m venv venv`, `source venv/bin/activate`, `pip install -r requirements.txt`.

## Si ViT no carga

- En **Apple Silicon (M1/M2)** puede no haber wheel de tensorflow-text; en ese caso usar solo CNN o buscar un wheel de terceros.
- El frontend hace fallback automático a CNN si ViT no está disponible.
