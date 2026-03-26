# Despliegue en Cloudflare + backend (guía de producción)

Este monorepo no ejecuta TensorFlow en **Cloudflare Workers** (límite de CPU/memoria y sin wheels pesados). El flujo recomendado es:

| Capa | Servicio típico | Rol |
|------|-------------------|-----|
| Frontend | **Cloudflare Pages** | React (Vite); `VITE_API_BASE_URL` → tu API |
| API | **Render / Fly / VPS** | Node (`backend/`) — MongoDB, Auth0, proxy a ML |
| ML | **Hugging Face Space** (Docker) o **Render** | Python + TensorFlow (`ml-service/` + `hf-space/space_app.py`) |

---

## 1. Modelo ViT (`best_model_17_marzo.keras`)

- **No** subas secretos al repo. Los pesos suelen estar en `.gitignore` (`*.keras`).
- Clasificación: solo **`best_model_17_marzo.keras`**.
- Opciones:
  - **GitHub Release** (ver `hf-space/Dockerfile` + `ARG GITHUB_REPO` / `MODELS_RELEASE_TAG`).
  - **URL pública** (`HF_VIT_URL` en build Docker), p. ej.:
    `https://huggingface.co/USER/REPO/resolve/main/best_model_17_marzo.keras`
  - Copia local en `ml-service/models/` y monta volumen en Docker (ver `docker-compose.ml.yml` comentado).

Variables útiles: `ML_VIT_PATH`, `FASHION_ML_ROOT` (si empaquetas el servicio en otra ruta).

---

## 2. Build del frontend (Cloudflare Pages)

1. Conecta el repo GitHub a **Pages**.
2. **Build command:** `cd frontend && npm ci && npm run build`
3. **Output directory:** `frontend/dist`
4. **Variables de entorno (Production):**
   - `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_AUTH0_CALLBACK_URL` (URL de Pages)
   - `VITE_API_BASE_URL` = URL del backend (sin `/` final)

5. **Redeploy** tras cambiar variables (Vite las inyecta en build).

---

## 3. Backend (Render u otro host)

1. **Root:** `backend/`
2. **Start:** `npm start`
3. Variables mínimas: `MONGODB_URI`, Auth0, `ML_SERVICE_URL` (URL del Space ML), `CORS_ORIGINS` (URL de Pages), almacenamiento de imágenes (`CLOUDINARY_*` o `R2_*`).

Detalle: `docs/ENV_CHECKLIST.md`.

---

## 4. ML (Hugging Face Space con Docker)

1. En el Space, **Dockerfile** debe construirse desde la **raíz del repo**:
   ```bash
   docker build -f hf-space/Dockerfile .
   ```
2. En la UI de HF, ajusta el **contexto de build** al repositorio completo (no solo la carpeta `hf-space/`).
3. Opcional en build: `--build-arg HF_VIT_URL=https://huggingface.co/.../resolve/main/best_model_17_marzo.keras`
4. Copia la URL del Space (`https://USER-SPACE.hf.space`) y ponla en **`ML_SERVICE_URL`** del backend.

---

## 5. Probar la API tras el despliegue

```bash
# Health (Space o ml-service local)
curl -s "$ML_SERVICE_URL/health" | jq .

# Clasificación ViT (mismo contrato que siempre)
curl -s -X POST -F "imagen=@/ruta/a/imagen.jpg" "$ML_SERVICE_URL/classify-vit" | jq .

# FastAPI opcional (solo si ejecutas run_fastapi.py)
curl -s -X POST -F "imagen=@/ruta/a/imagen.jpg" "$ML_SERVICE_URL/predict" | jq .
```

---

## 6. Servidor ML local (Flask)

```bash
cd ml-service
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export ML_VIT_PATH="$(pwd)/models/best_model_17_marzo.keras"  # o tu ruta
python app.py
```

**FastAPI opcional (puerto 6001):**

```bash
export ML_VIT_PATH=...
python run_fastapi.py
```

---

## 7. Checklist final

- [ ] Sin credenciales en repo; `.env` solo local / panel del host.
- [ ] Frontend con `VITE_API_BASE_URL` correcto y redeploy.
- [ ] Backend con `CORS_ORIGINS` y `ML_SERVICE_URL`.
- [ ] Pesos accesibles en el contenedor ML (Release, URL o volumen).
- [ ] `/health` y `/classify-vit` responden tras “despertar” el Space si está en cold start.
