# Obtener el modelo ViT (`best_model_17_marzo.keras`)

El clasificador usa **solo** el archivo **`best_model_17_marzo.keras`**. No está en el repositorio (suele ignorarse con `.gitignore`).

## Dónde colocarlo

Ruta recomendada en este proyecto:

```text
ml-service/models/best_model_17_marzo.keras
```

O define la variable de entorno **`ML_VIT_PATH`** con la ruta absoluta al archivo.

## Si el modelo está en otro repo (Git LFS)

1. En el repo donde esté el archivo, asegúrate de tener Git LFS instalado (`git lfs install`) y haz `git lfs pull` si hace falta.
2. Copia el archivo a `ml-service/models/best_model_17_marzo.keras` en este proyecto.
3. Comprueba el tamaño (no debe ser un puntero LFS vacío de unos bytes).

```bash
ls -lh ml-service/models/best_model_17_marzo.keras
```

## Publicar para despliegue (GitHub Release)

Desde la raíz del repo, con el archivo ya en `ml-service/models/best_model_17_marzo.keras`:

```bash
./scripts/publish-models-release.sh models-v1.0
```

Los Dockerfiles (`hf-space/Dockerfile`, etc.) descargan ese asset en el build o usan **`HF_VIT_URL`** si lo defines.
