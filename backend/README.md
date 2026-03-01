# Backend – Fashion AI API

Este directorio es **solo la API** (Node.js + Express). **No hay código de frontend aquí.**

## ¿Por qué se menciona "frontend" en el backend?

- El **frontend** es la app React que está en la carpeta hermana `../frontend/`. Es otra aplicación (Vite/React) que corre en otro proceso (puerto 3000) y consume esta API.
- En el backend solo hay:
  - **Rutas de API** (`/api/prendas`, `/api/classify`, etc.) que devuelven JSON.
  - **Rutas estáticas** para datos: `/uploads` (fotos subidas por usuarios) y `/api/model/images` (imágenes del ml-service). La app React las usa para mostrar imágenes; el backend solo sirve los ficheros, no contiene pantallas ni componentes.
- Cuando en código o comentarios se dice "for frontend" o "el frontend envía...", se refiere a esa **app React separada**, no a algo dentro de este proyecto.

## Cómo arrancar en local (backend + frontend + ML)

Desde la raíz del proyecto (el backend usa **`backend/.env`**):

```bash
./start-all.sh
```

Se levantan los tres: backend (4000), frontend (3000), ML (6001). Para parar: `./stop-all.sh`.

Si el ML falla con "No module named 'flask'", instala dependencias en el venv:

```bash
cd ml-service && source venv/bin/activate && pip install -r requirements.txt
```

Luego vuelve a ejecutar `./start-all.sh`.

## Solo backend (en primer plano)

```bash
./start-backend-only.sh
```

Configuración en **`backend/.env`**. El archivo `.env.example` es solo plantilla; no se carga.
