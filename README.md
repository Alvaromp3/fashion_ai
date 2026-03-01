# Fashion AI

A full-stack web application for uploading clothing images, classifying them with CNN or Vision Transformer (ViT) models, and generating outfit recommendations from the user's wardrobe.

## Summary

Fashion AI lets users build a digital wardrobe by uploading garment photos. The system classifies each item (type and colour) via a machine learning service that supports both a convolutional neural network (CNN) and a Vision Transformer (ViT). Users can filter garments by category, set preferences (occasion, style, colours), and receive outfit suggestions that combine top, bottom, and shoes. Recommendations can be saved for later. The project includes a metrics view (confusion matrices, classification reports) and a model examples page describing the supported garment classes.

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
cd fashion_program
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (use `.env.example` if available):

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/fashion_ai
ML_SERVICE_URL=http://localhost:6001
NODE_ENV=development
```

Optional (for cloud image storage):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

If Cloudinary is not set, images are stored under `backend/uploads/`.

**Authentication (Auth0):** The app uses Auth0 for login and per-user data. Add these to `backend/.env` and to the project root or `frontend/.env` (frontend uses `VITE_` prefix so they are available in the browser):

- **Backend:** `AUTH0_DOMAIN=your-tenant.auth0.com`, `AUTH0_AUDIENCE=https://fashion-ai-api` (or your Auth0 API identifier).
- **Frontend:** `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_AUTH0_CALLBACK_URL=http://localhost:3000`.

In the Auth0 Dashboard: create a **Single Page Application** and an **API**. Set the API identifier (audience) to match `AUTH0_AUDIENCE`. For the SPA, set Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins to `http://localhost:3000` (and your production URL when deploying).

**Admin dashboard:** The Metrics and Examples views are in the Admin area (`/admin`), restricted to users with an `admin` role. Add a custom claim to your access token (e.g. `https://fashion-ai-api/roles` or set `AUTH0_ROLES_CLAIM` in backend `.env`) containing a `roles` array with `"admin"` for users who should see the Admin link and access model metrics/examples. Configure this in Auth0 via Actions or Rules that add `app_metadata.roles` to the token.

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

## Deployment (free tier)

To host the app for free: **ML** on Hugging Face Spaces, **frontend** on Cloudflare Pages, **backend** on Render, **images** on Cloudflare R2. See:

- **[docs/HOST_THE_REST.md](docs/HOST_THE_REST.md)** — short guide to host backend (Render) + frontend (Pages) after ML is on HF.
- **[docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md)** — full ordered checklist with every env var and where to set it.
- **[docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md)** — Cloudflare **Wrangler CLI**: create R2 bucket (`npm run cloudflare:r2-create`) and deploy Pages (`npm run cloudflare:pages-deploy`).
- **[docs/CLOUDFLARE_PROTECTIONS.md](docs/CLOUDFLARE_PROTECTIONS.md)** — Cloudflare-side protections so you never get charged (no payment method, R2 cap in app, optional cron check).
- **[docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md)** — Path A (Render + Pages) or Path B (HF Space + R2).
- **[docs/COST_AND_LIMITS.md](docs/COST_AND_LIMITS.md)** — free-tier limits and how to avoid charges.

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
fashion_program/
├── backend/
│   ├── models/          # MongoDB models (Prenda, Outfit)
│   ├── routes/          # API routes (prendas, outfits, classify, model)
│   ├── utils/           # e.g. Cloudinary
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components and UI
│   │   ├── pages/       # Dashboard, Garments, Outfits, Metrics, Examples
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js   # dev proxy to backend
│   └── package.json
├── ml-service/
│   ├── app.py           # Flask app: classify, metrics, confusion matrix
│   ├── requirements.txt
│   └── (model files)    # e.g. modelo_ropa.h5
└── README.md
```

## API overview

| Area           | Method | Endpoint                          | Description                |
| -------------- | ------ | --------------------------------- | -------------------------- |
| Garments       | POST   | `/api/prendas/upload`             | Upload and store a garment |
| Garments       | GET    | `/api/prendas`                    | List garments              |
| Garments       | GET    | `/api/prendas/filter?type=...`    | Filter by type             |
| Garments       | DELETE | `/api/prendas/:id`                | Delete a garment           |
| Garments       | PUT    | `/api/prendas/:id/ocasion`        | Update garment occasions   |
| Classification | POST   | `/api/classify`                   | Classify image (CNN)       |
| Classification | POST   | `/api/classify/vit`               | Classify image (ViT)       |
| Outfits        | GET    | `/api/outfits/recommend`          | Get outfit recommendations |
| Outfits        | POST   | `/api/outfits/save`               | Save an outfit             |
| Outfits        | GET    | `/api/outfits`                    | List saved outfits         |
| Outfits        | DELETE | `/api/outfits/:id`                | Delete an outfit           |
| Model          | GET    | `/api/model/metrics`              | CNN metrics                |
| Model          | GET    | `/api/model/metrics-vit`          | ViT metrics                |
| Model          | GET    | `/api/model/confusion-matrix`     | CNN confusion matrix image |
| Model          | GET    | `/api/model/confusion-matrix-vit` | ViT confusion matrix image |
| Model          | GET    | `/api/model/data-audit`           | Dataset sample image       |

## Features

- **Garments:** Upload images; classify with CNN or ViT; view and filter by type (top, bottom, shoes, coat, dress, etc.); edit occasions; delete.
- **Outfits:** Generate up to three outfit suggestions (Surprise Me or with preferences); filter by occasion, style, and preferred colours; save and delete outfits.
- **Metrics:** View confusion matrices and classification reports for CNN and ViT.
- **Examples:** Browse the garment categories and short descriptions used by the models.

## Troubleshooting

- **Classification or recommendations fail:** Ensure the backend is running on port 4000 and the ML service on port 6001. Check backend and ML logs for errors.
- **MongoDB errors:** Confirm MongoDB is running and `MONGODB_URI` in `.env` is correct.
- **Images not loading:** If not using Cloudinary, ensure `backend/uploads/` exists and the backend serves `/uploads` correctly.

## Notes

- The application does not implement user authentication; data is shared for all users (suitable for a demo or university project).
- You must provide your own trained model file(s) and align class names and types in `ml-service/app.py` with your training setup.

## License

For educational use only.
