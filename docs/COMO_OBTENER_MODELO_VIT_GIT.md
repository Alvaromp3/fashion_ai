# Cómo obtener el modelo ViT con Git (paso a paso)

El modelo **vision_transformer_moda_modelo.keras** (~1 GB) no está en este repo (está en `.gitignore`). Si tienes **otro repositorio** donde sí está guardado con **Git LFS**, sigue estos pasos para traer el archivo real y usarlo aquí.

---

## Requisitos

- **Git** instalado.
- **Git LFS** instalado. Si no lo tienes:
  - macOS: `brew install git-lfs` y luego `git lfs install`.
  - Comprueba: `git lfs version`.

---

## Paso 1: Clonar el repo que tiene el modelo (con LFS)

Necesitas la URL del repositorio donde está el modelo (el mismo del que salió la carpeta de Downloads con el puntero LFS).

```bash
# Ejemplo: si el repo es https://github.com/Alvaromp3/fashion_ai (o el que sea)
cd ~/Downloads
git clone https://github.com/USUARIO/REPO.git fashion_ai-modelos
cd fashion_ai-modelos
```

Sustituye `USUARIO/REPO` por la URL real del repo.

---

## Paso 2: Descargar los archivos grandes con Git LFS

Dentro del repo clonado, Git LFS descargará el contenido real de los archivos marcados con LFS (entre ellos el `.keras`).

```bash
git lfs pull
```

Si ya habías clonado antes y solo ves el puntero:

```bash
git lfs fetch --all
git lfs checkout
```

Comprueba que el archivo ya no es un puntero (debe pesar ~1 GB):

```bash
ls -lh ml-service/vision_transformer_moda_modelo.keras
```

Deberías ver algo como **~980M** o **~1G**, no 135 bytes.

---

## Paso 3: Copiar el modelo al proyecto fashion_ai

Con el archivo real ya en el repo clonado, cópialo a la carpeta `ml-service` de tu proyecto:

```bash
cp ml-service/vision_transformer_moda_modelo.keras /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/
```

(O si estás en otra ruta, usa la ruta absoluta de tu proyecto en lugar de `/Users/alvaromartin-pena/Projects/fashion_ai`.)

Verifica de nuevo el tamaño:

```bash
ls -lh /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/vision_transformer_moda_modelo.keras
```

---

## Paso 4: Arrancar el servicio

Desde la raíz del proyecto fashion_ai:

```bash
cd /Users/alvaromartin-pena/Projects/fashion_ai
./stop-all.sh
npm run start
```

o:

```bash
./start-all.sh
```

Cuando el ML termine de cargar (un poco más de 1 minuto), el ViT estará disponible y podrás usar **Classify (ViT)** en la app.

---

## Resumen rápido

| Paso | Comando |
|------|--------|
| 1 | `cd ~/Downloads && git clone <URL_REPO> fashion_ai-modelos && cd fashion_ai-modelos` |
| 2 | `git lfs pull` (o `git lfs fetch --all` + `git lfs checkout`) |
| 3 | `cp ml-service/vision_transformer_moda_modelo.keras /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/` |
| 4 | `cd /Users/alvaromartin-pena/Projects/fashion_ai && ./start-all.sh` |

---

## Si no tienes ese repo o no usas LFS

- Si tienes el archivo **vision_transformer_moda_modelo.keras** en otro sitio (Escritorio, USB, otro equipo), cópialo directamente a:

  ```text
  /Users/alvaromartin-pena/Projects/fashion_ai/ml-service/vision_transformer_moda_modelo.keras
  ```

- Si el modelo está en un **GitHub Release** de este u otro repo, descárgalo desde la página del Release y colócalo en la misma ruta de arriba.
