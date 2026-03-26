# Fashion AI

A full-stack web application for uploading clothing images, classifying them with a **Vision Transformer (ViT)** model (`best_model_17_marzo.keras`), and generating outfit recommendations from the user's wardrobe. Includes **Mirror**: real-time outfit feedback via camera and AI (OpenRouter), with optional Auth0 login and per-user wardrobe.

## Summary

Fashion AI lets users build a digital wardrobe by uploading garment photos. The system classifies each item (type and colour) via a machine learning service (**ViT only**: `best_model_17_marzo.keras`). Users can filter garments by category, set preferences (occasion, style, colours), and receive outfit suggestions. **Mirror** uses the camera and OpenRouter to analyse the current outfit and give preparation-focused tips for the chosen occasion (e.g. business casual). Optional Auth0 login scopes data per user; images can be stored locally or in Cloudinary.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **ML service:** Python, Flask; TensorFlow/Keras ViT (`.keras`) for image classification

## Prerequisites

- Node.js v18 or higher
- Python 3.10+ (3.11 recommended for `ml-service` / TensorFlow)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd fashion_ai
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with the variables below (see `backend/README-AUTH.md` for Auth0):

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/fashion_ai
ML_SERVICE_URL=http://localhost:6001
NODE_ENV=development
```

**OpenRouter (Mirror AI):**

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
```

**Auth0 (optional; per-user wardrobe and login):**

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://your-api-identifier
```

See `backend/README-AUTH.md` and `frontend/AUTH0-CHECKLIST.md` for SPA/API setup and `VITE_*` variables in `frontend/.env`. If Auth0 is not set, the app uses an anonymous user.

**Cloudinary (optional; cloud image storage):**

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

If Cloudinary is not set, images are stored under `backend/uploads/`.

**Team — Env Vault (push/pull all keys):** We use [Env Vault](docs/ENV_VAULT_QUICK.md) instead of emailing passwords. From repo root: **`npm run env:vault-pull`** to get the latest keys; **`npm run env:vault-push`** to save your keys to the vault. See [docs/DOTENV_VAULT.md](docs/DOTENV_VAULT.md) for setup.

**Admin dashboard:** The Metrics and Examples views are in the Admin area (`/admin`), restricted to users with an `admin` role. Add a custom claim to your access token (e.g. `https://fashion-ai-api/roles` or set `AUTH0_ROLES_CLAIM` in backend `.env`) containing a `roles` array with `"admin"` for users who should see the Admin link and access model metrics/examples. Configure this in Auth0 via Actions or Rules that add `app_metadata.roles` to the token.

### 3. ML service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Place **`ml-service/models/best_model_17_marzo.keras`** (ViT classifier), or set **`ML_VIT_PATH`** to the file’s absolute path. Class labels are defined in `ml-service/src/fashion_ml/labels.py`.

### 4. Frontend

```bash
cd frontend
npm install
```

## Running the application

### Arrancar en local (backend + frontend + ML)

**Guía con todas las opciones:** [docs/CORRER_EN_LOCAL.md](docs/CORRER_EN_LOCAL.md).

Un solo comando (usa **`backend/.env`**):

```bash
./start-all.sh
```

o `./run.sh`. Para parar: `./stop-all.sh`.

Si el ML falla (p. ej. "No module named 'flask'"), instala dependencias una vez:

```bash
cd ml-service && source venv/bin/activate && pip install -r requirements.txt
```

### Solo backend

```bash
./start-backend-only.sh
```

### Desarrollo manual (en terminales separadas)

**Backend (puerto 4000):**

```bash
cd backend
npm run dev
```

**ML service (puerto 6001):**

```bash
cd ml-service
source venv/bin/activate
python app.py
```

**Frontend (default port 3000):**

```bash
cd frontend
npm run dev
```

The app is available at `http://localhost:3000`. The frontend proxies `/api` and `/uploads` to the backend (default `http://localhost:4000`).

## Deployment (free tier)

To host the app for free: **ML** on Hugging Face Spaces, **frontend** on Cloudflare Pages, **backend** on Render, **images** on Cloudflare R2. See:

- **[docs/HOST_THE_REST.md](docs/HOST_THE_REST.md)** — short guide to host backend (Render) + frontend (Pages) after ML is on HF.
- **[docs/RENDER_CLI.md](docs/RENDER_CLI.md)** — Render CLI: validate blueprint, trigger deploys (`npm run render:validate`, `npm run render:deploy`).
- **[docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md)** — full ordered checklist with every env var and where to set it.
- **[docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md)** — Cloudflare **Wrangler CLI**: create R2 bucket (`npm run cloudflare:r2-create`) and deploy Pages (`npm run cloudflare:pages-deploy`).
- **[docs/CLOUDFLARE_PROTECTIONS.md](docs/CLOUDFLARE_PROTECTIONS.md)** — Cloudflare-side protections so you never get charged (no payment method, R2 cap in app, optional cron check).
- **[docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md)** — Path A (Render + Pages) or Path B (HF Space + R2).
- **[docs/COST_AND_LIMITS.md](docs/COST_AND_LIMITS.md)** — free-tier limits and how to avoid charges.

## Publishing models as a GitHub release and building Docker

The trained ViT weights are not stored in the repo. Publish them once as a GitHub release so Docker can download **`best_model_17_marzo.keras`** at build time.

### 1. Publish the model as a release

Install the [GitHub CLI](https://cli.github.com/) and log in (`gh auth login`). Place the file at **`ml-service/models/best_model_17_marzo.keras`**.

From the project root:

```bash
chmod +x scripts/publish-models-release.sh
./scripts/publish-models-release.sh models-v1.0
```

This creates (or replaces) the release tag `models-v1.0` and uploads the asset. Use another tag if you prefer (e.g. `models-v1.1`).

### 2. Build the Docker image using the release

Set your GitHub repo (owner/name) and optionally the release tag, then build:

```bash
export GITHUB_REPO=your-username/fashion_program
export MODELS_RELEASE_TAG=models-v1.0   # optional; default is models-v1.0

docker compose -f docker-compose.ml.yml build
docker compose -f docker-compose.ml.yml up -d ml
```

The Hugging Face / Docker build downloads **`best_model_17_marzo.keras`** from `https://github.com/<GITHUB_REPO>/releases/download/<MODELS_RELEASE_TAG>/best_model_17_marzo.keras`, or unpacks **`vit_model_v1.zip`** if it contains a `.keras` file. For a **private** repository, pass a token when building:

```bash
docker compose -f docker-compose.ml.yml build --build-arg GITHUB_TOKEN=ghp_xxxxxxxx
```

## Project structure

```
fashion_ai/
├── backend/             # Express API, MongoDB, Auth0, proxy to ML
├── frontend/            # React + Vite
├── ml-service/
│   ├── app.py           # Flask entry (loads fashion_ml)
│   ├── src/fashion_ml/  # inference, config, Flask routes
│   ├── models/          # optional local weights (gitignored)
│   └── requirements.txt
├── hf-space/            # FastAPI wrapper for Hugging Face Spaces (Dockerfile)
├── docs/                # deployment and env guides
├── scripts/             # release models, Cloudflare, Render helpers
├── start-all.sh
└── stop-all.sh
```

Model files (`.h5`, `.keras`) stay **out of git**; use a GitHub Release or Hugging Face file URL at Docker build time (see `docs/DEPLOY_CLOUDFLARE.md`).

## API overview

All endpoints are under the backend base URL (e.g. `http://localhost:4000`). When Auth0 is configured, `POST`/`GET`/`PUT`/`DELETE` for `/api/prendas` and `/api/outfits` require a valid JWT: `Authorization: Bearer <token>`.

| Area           | Method | Endpoint | Description |
|----------------|--------|----------|-------------|
| Health         | GET    | `/api/health` | Backend and MongoDB status |
| Health         | GET    | `/api/ml-health` | ML service (ViT) status |
| **Mirror**     | GET    | `/api/mirror/status` | OpenRouter config check |
| **Mirror**     | POST   | `/api/mirror/analyze` | Text-only analysis (body: `userPrompt`) |
| **Mirror**     | POST   | `/api/mirror/analyze-frame` | Image + context analysis (body: `imageDataUrl`, `context`, `userNotes`) |
| Garments       | POST   | `/api/prendas/upload` | Upload and store a garment (multipart) |
| Garments       | POST   | `/api/prendas/auto` | Add garment from base64 (e.g. Mirror; body: `imagen_base64`, `tipo`, `color`, `clase_nombre`, `confianza`, `ocasion`) |
| Garments       | GET    | `/api/prendas` | List garments (per user if Auth0) |
| Garments       | GET    | `/api/prendas/filter?type=...` | Filter by type |
| Garments       | PUT    | `/api/prendas/:id/ocasion` | Update garment occasions |
| Garments       | DELETE | `/api/prendas/:id` | Delete a garment |
| Classification | POST   | `/api/classify` | Classify image (ViT; multipart `imagen`) |
| Classification | POST   | `/api/classify/vit` | Same ViT classifier (multipart) |
| Classification | POST   | `/api/classify/vit-base64` | Classify from base64 (Mirror; body: `imageDataUrl`) |
| Outfits        | GET    | `/api/outfits/recommend` | Get outfit recommendations (query params: preferences) |
| Outfits        | POST   | `/api/outfits/save` | Save an outfit |
| Outfits        | GET    | `/api/outfits` | List saved outfits |
| Outfits        | DELETE | `/api/outfits/:id` | Delete an outfit |
| Model          | GET    | `/api/model/metrics` | Training metrics JSON (if present in ML service) |
| Model          | GET    | `/api/model/metrics-vit` | ViT metrics JSON (if present) |
| Model          | GET    | `/api/model/confusion-matrix` | Confusion matrix image (if present) |
| Model          | GET    | `/api/model/confusion-matrix-vit` | ViT confusion matrix image (if present) |
| Model          | GET    | `/api/model/data-audit` | Dataset sample image |

Static: `/uploads` serves uploaded images (or use Cloudinary); `/api/model/images` can serve ML-related assets.

## Features

- **Garments:** Upload images; classify with ViT; view and filter by type; edit occasions; delete. With Auth0, each user has their own wardrobe; uploads can be stored in `backend/uploads/{userId}/` or Cloudinary.
- **Outfits:** Generate outfit suggestions (with preferences); save and delete. Scoped per user when Auth0 is enabled.
- **Mirror:** Use the camera to capture your outfit; get AI feedback (OpenRouter) focused on **preparing for the chosen occasion** (e.g. business casual). Tips are constructive and supportive. Optionally classify the frame with ViT and add the item to your wardrobe.
- **Metrics:** Optional confusion matrices and reports (JSON/images) if shipped with the ML service; not required at runtime for inference.
- **Examples:** Garment categories and descriptions used by the models.

## Troubleshooting

- **Classification or recommendations fail:** Ensure the backend is running on port 4000 and the ML service on port 6001. Check backend and ML logs.
- **MongoDB errors:** Confirm MongoDB is running and `MONGODB_URI` in `.env` is correct.
- **Mirror "Service not found":** Create an API in Auth0 with Identifier equal to `AUTH0_AUDIENCE` (e.g. `https://fashion-classifier-api`). See `frontend/AUTH0-CHECKLIST.md`.
- **Camera not showing:** Ensure the browser has camera permission for localhost; if you see "Stop" but no image, a fix ensures the stream is attached after the video element is in the DOM.
- **Images not loading:** If not using Cloudinary, ensure `backend/uploads/` exists and the backend serves `/uploads`.

## Notes

- **Auth0:** Optional. When `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are set, `/api/prendas` and `/api/outfits` require a valid JWT. Each user's garments and outfits are stored with a `userId`; uploads go to `uploads/{userId}/`. See `backend/README-AUTH.md` and `frontend/AUTH0-CHECKLIST.md`.
- **OpenRouter:** Required for Mirror AI. Set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`) in `backend/.env`.
- You must provide trained model weights; class names are in `ml-service/src/fashion_ml/labels.py` unless you change the training to match a different taxonomy.

## License

For educational use only.
