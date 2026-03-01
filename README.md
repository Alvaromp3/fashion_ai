# Fashion AI

A full-stack web application for uploading clothing images, classifying them with CNN or Vision Transformer (ViT) models, and generating outfit recommendations from the user's wardrobe. Includes **Mirror**: real-time outfit feedback via camera and AI (OpenRouter), with optional Auth0 login and per-user wardrobe.

## Summary

Fashion AI lets users build a digital wardrobe by uploading garment photos. The system classifies each item (type and colour) via a machine learning service (CNN and ViT). Users can filter garments by category, set preferences (occasion, style, colours), and receive outfit suggestions. **Mirror** uses the camera and OpenRouter to analyse the current outfit and give preparation-focused tips for the chosen occasion (e.g. business casual). Optional Auth0 login scopes data per user; images can be stored locally or in Cloudinary.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **ML service:** Python, Flask; CNN (e.g. Keras/TensorFlow) and optional ViT for image classification

## Prerequisites

- Node.js v18 or higher
- Python 3.8 or higher
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd fashion_ai_clean
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

See `backend/README-AUTH.md` and `frontend/AUTH0-CHECKLIST.md` for setup. If Auth0 is not set, the app uses an anonymous user.

**Cloudinary (optional; cloud image storage):**

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

If Cloudinary is not set, images are stored under `backend/uploads/`.

### 3. ML service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Place your trained CNN model file in `ml-service/` (e.g. `modelo_ropa.h5`) and ensure `ml-service/app.py` uses the correct class names and paths. If you use ViT, configure it as described in the ML service documentation.

### 4. Frontend

```bash
cd frontend
npm install
```

## Running the application

Run all three parts (from the project root or in separate terminals).

**Backend (default port 4000):**

```bash
cd backend
npm run dev
```

**ML service (default port 6001):**

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

## Publishing models as a GitHub release and building Docker

The ML models (CNN and ViT) are not stored in the repo. You can publish them once as a GitHub release so that the Docker image can download them at build time.

### 1. Publish the models as a release

Install the [GitHub CLI](https://cli.github.com/) and log in (`gh auth login`). Place the model files in `ml-service/`:

- `modelo_ropa.h5` (CNN)
- `vision_transformer_moda_modelo.keras` (ViT)

From the project root:

```bash
chmod +x scripts/publish-models-release.sh
./scripts/publish-models-release.sh models-v1.0
```

This creates (or replaces) the release tag `models-v1.0` and uploads both files as assets. Use another tag if you prefer (e.g. `models-v1.1`).

### 2. Build the Docker image using the release

Set your GitHub repo (owner/name) and optionally the release tag, then build:

```bash
export GITHUB_REPO=your-username/fashion_program
export MODELS_RELEASE_TAG=models-v1.0   # optional; default is models-v1.0

docker compose -f docker-compose.ml.yml build
docker compose -f docker-compose.ml.yml up -d ml
```

The Dockerfile downloads the two model files from `https://github.com/<GITHUB_REPO>/releases/download/<MODELS_RELEASE_TAG>/...` during build. For a **private** repository, pass a token when building:

```bash
docker compose -f docker-compose.ml.yml build --build-arg GITHUB_TOKEN=ghp_xxxxxxxx
```

## Project structure

```
fashion_ai_clean/
├── backend/
│   ├── config/          # e.g. OpenRouter
│   ├── middleware/      # Auth0 (requireAuth, getUserId)
│   ├── models/          # MongoDB (Prenda, Outfit)
│   ├── routes/          # prendas, outfits, classify, mirror, model
│   ├── utils/           # e.g. Cloudinary
│   ├── server.js
│   └── .env             # PORT, MONGODB_URI, ML_SERVICE_URL, OpenRouter, Auth0, Cloudinary
├── frontend/
│   ├── src/
│   │   ├── components/  # LoginGuard, navbar, modals, UI
│   │   ├── pages/       # Dashboard, Garments, Outfits, Mirror, Metrics, Examples
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env             # VITE_AUTH0_* for login
│   ├── vite.config.js   # dev proxy to backend
│   └── package.json
├── ml-service/
│   ├── app.py           # Flask: classify, classify-vit, health, metrics
│   ├── requirements.txt
│   └── (model files)    # e.g. modelo_ropa.h5, vision_transformer_*.keras
├── start-all.sh         # run backend + frontend + ML
├── stop-all.sh
└── README.md
```

## API overview

All endpoints are under the backend base URL (e.g. `http://localhost:4000`). When Auth0 is configured, `POST`/`GET`/`PUT`/`DELETE` for `/api/prendas` and `/api/outfits` require a valid JWT: `Authorization: Bearer <token>`.

| Area           | Method | Endpoint | Description |
|----------------|--------|----------|-------------|
| Health         | GET    | `/api/health` | Backend and MongoDB status |
| Health         | GET    | `/api/ml-health` | ML service (CNN/ViT) status |
| **Mirror**     | GET    | `/api/mirror/status` | OpenRouter config check |
| **Mirror**     | POST   | `/api/mirror/analyze` | Text-only analysis (body: `userPrompt`) |
| **Mirror**     | POST   | `/api/mirror/analyze-frame` | Image + context analysis (body: `imageDataUrl`, `context`, `userNotes`) |
| Garments       | POST   | `/api/prendas/upload` | Upload and store a garment (multipart) |
| Garments       | POST   | `/api/prendas/auto` | Add garment from base64 (e.g. Mirror; body: `imagen_base64`, `tipo`, `color`, `clase_nombre`, `confianza`, `ocasion`) |
| Garments       | GET    | `/api/prendas` | List garments (per user if Auth0) |
| Garments       | GET    | `/api/prendas/filter?type=...` | Filter by type |
| Garments       | PUT    | `/api/prendas/:id/ocasion` | Update garment occasions |
| Garments       | DELETE | `/api/prendas/:id` | Delete a garment |
| Classification | POST   | `/api/classify` | Classify image (CNN; multipart `imagen`) |
| Classification | POST   | `/api/classify/vit` | Classify image (ViT; multipart) |
| Classification | POST   | `/api/classify/vit-base64` | Classify from base64 (Mirror; body: `imageDataUrl`) |
| Outfits        | GET    | `/api/outfits/recommend` | Get outfit recommendations (query params: preferences) |
| Outfits        | POST   | `/api/outfits/save` | Save an outfit |
| Outfits        | GET    | `/api/outfits` | List saved outfits |
| Outfits        | DELETE | `/api/outfits/:id` | Delete an outfit |
| Model          | GET    | `/api/model/metrics` | CNN metrics |
| Model          | GET    | `/api/model/metrics-vit` | ViT metrics |
| Model          | GET    | `/api/model/confusion-matrix` | CNN confusion matrix image |
| Model          | GET    | `/api/model/confusion-matrix-vit` | ViT confusion matrix image |
| Model          | GET    | `/api/model/data-audit` | Dataset sample image |

Static: `/uploads` serves uploaded images (or use Cloudinary); `/api/model/images` can serve ML-related assets.

## Features

- **Garments:** Upload images; classify with CNN or ViT; view and filter by type; edit occasions; delete. With Auth0, each user has their own wardrobe; uploads can be stored in `backend/uploads/{userId}/` or Cloudinary.
- **Outfits:** Generate outfit suggestions (with preferences); save and delete. Scoped per user when Auth0 is enabled.
- **Mirror:** Use the camera to capture your outfit; get AI feedback (OpenRouter) focused on **preparing for the chosen occasion** (e.g. business casual). Tips are constructive and supportive. Optionally classify the frame with ViT and add the item to your wardrobe.
- **Metrics:** Confusion matrices and classification reports for CNN and ViT.
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
- You must provide your own trained model file(s) and align class names in `ml-service/app.py` with your setup.

## License

For educational use only.
