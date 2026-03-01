# Free hosting: Frontend, Backend, and ML on separate free tiers

**Preferred free stack:** For a better fit (more RAM for ML, no egress for images), see **[HF Spaces + Cloudflare Pages + R2](HF_SPACES_CLOUDFLARE_R2.md)** — Hugging Face Spaces for inference, Cloudflare Pages for frontend, R2 for image storage.

**Cost and limits:** See **[COST_AND_LIMITS.md](COST_AND_LIMITS.md)** for what’s free, hard limits, and how to avoid charges.

This guide splits the app into **three deployments** (Render + Pages) so each part uses its own free tier allowance:

| Service   | Host             | Free tier        |
|----------|------------------|------------------|
| Frontend | **Cloudflare Pages** | Unlimited static requests |
| Backend  | **Render** (Web Service) | 750 hrs/month, 512 MB |
| ML (model) | **Render** (Web Service) | 750 hrs/month, 512 MB (or Docker with more memory on paid) |

You already use **MongoDB Atlas** (free M0), **Auth0** (free), and **Cloudinary** (free). No change needed there.

---

## ML model specs (for capacity planning)

| Item | Value |
|------|--------|
| **Framework** | **Keras / TensorFlow** (TF 2.x). CNN is legacy Keras `.h5`; ViT is `.keras` (Keras 3 / TF backend). Optional dependency: `keras_hub` for ViT custom layers. |
| **Models** | **CNN:** `modelo_ropa.h5` — **~22 MB** on disk.<br>**ViT:** `vision_transformer_moda_modelo.keras` — typically **~50–200+ MB** on disk (depends on architecture). |
| **Input image size** | **224×224** pixels (RGB). The app resizes/crops uploads to this before inference. |
| **Max upload size** | **10 MB** per image (backend `classify` route limit). Accepted formats: JPEG, PNG, GIF, WebP, HEIC, HEIF, BMP, TIFF. |
| **Expected requests/day** | **Free tier (demo / light use):** on the order of **tens to low hundreds** of classification requests per day. Render free ML service spins down after ~15 min idle, so bursty usage is fine; sustained high volume will hit 750 hrs/month and memory limits. For **hundreds per day** with both models loaded, 512 MB RAM may be tight; consider CNN-only or a paid instance. |

---

## 1. Deploy ML service (Render)

The ML service runs your CNN + ViT models. Render free tier has **512 MB RAM**; TensorFlow + both models may need more. If the ML service crashes with OOM, use **one model** (e.g. CNN only) or consider a small paid instance.

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your Git repo and select the repo that contains this project.
3. Render will read `render.yaml`. You should see two services: **fashion-ai-backend** and **fashion-ai-ml**.
4. **Deploy the ML service first** (backend will need its URL).
   - Open the **fashion-ai-ml** service.
   - **Root Directory:** `ml-service` (already set in blueprint).
   - **Docker:** Render uses `ml-service/Dockerfile`. The Dockerfile downloads model files from a GitHub Release. Set:
     - **GITHUB_REPO:** `your-username/fashion_ai` (or your repo).
     - **MODELS_RELEASE_TAG:** e.g. `models-v1.0` (the release where you attached `modelo_ropa.h5` and `vision_transformer_moda_modelo.keras`).
     - If the repo is **private**, add **GITHUB_TOKEN** (GitHub Personal Access Token with `repo`).
   - The Dockerfile copies `model_metrics.json`, `model_metrics_vit.json`, `confusion_matrix.png`, `confusion_matrix_vit.png`, `data_audit.png` from `ml-service/`. If any are missing, the build will fail: either commit them or remove/comment out that `COPY` line in `ml-service/Dockerfile` (the admin metrics/confusion routes will then 404).
5. Deploy. After deploy, note the **ML service URL**, e.g. `https://fashion-ai-ml.onrender.com`.

---

## 2. Deploy Backend (Render)

1. In the same Blueprint, open **fashion-ai-backend**.
2. **Environment variables** (in Render Dashboard for this service):

   | Key | Value |
   |----|--------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `AUTH0_DOMAIN` | e.g. `dev-xxx.us.auth0.com` |
   | `AUTH0_AUDIENCE` | e.g. `https://fashion-ai-api` |
   | `ML_SERVICE_URL` | **ML service URL from step 1** (e.g. `https://fashion-ai-ml.onrender.com`) |
   | `CORS_ORIGINS` | Your **frontend** URL (e.g. `https://your-app.pages.dev`) — add after you deploy the frontend |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
   | `OPENROUTER_API_KEY` | If you use OpenRouter |

   Do **not** commit real secrets to the repo; set them only in the Render Dashboard.

3. Deploy. Note the **backend URL**, e.g. `https://fashion-ai-backend.onrender.com`.

4. **Auth0:** In Auth0 Dashboard → Application (SPA) → add to **Allowed Callback URLs**, **Allowed Logout URLs**, **Allowed Web Origins**:
   - `https://your-frontend.pages.dev` (you’ll get this after step 3)
   - And your backend URL if needed for CORS: `https://fashion-ai-backend.onrender.com`

---

## 3. Deploy Frontend (Cloudflare Pages)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the same repo. Configure the build:
   - **Framework preset:** None (or Vite if available).
   - **Build command:** `cd frontend && npm ci && npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** leave empty (repo root).
3. **Environment variables** (Pages → your project → Settings → Environment variables):

   | Variable | Value | Notes |
   |----------|--------|--------|
   | `VITE_AUTH0_DOMAIN` | Your Auth0 domain | Same as backend |
   | `VITE_AUTH0_CLIENT_ID` | Your Auth0 SPA client ID | |
   | `VITE_AUTH0_AUDIENCE` | Same as AUTH0_AUDIENCE | |
   | `VITE_AUTH0_CALLBACK_URL` | `https://your-project.pages.dev` | Use the **exact** Pages URL (no trailing slash) |
   | `VITE_API_BASE_URL` | `https://fashion-ai-backend.onrender.com` | **Backend URL from step 2** (no trailing slash) |

4. Deploy. Your app will be at `https://<project-name>.pages.dev`.

5. **CORS:** In Render, for **fashion-ai-backend**, set:
   - `CORS_ORIGINS` = `https://<project-name>.pages.dev`
   (Add multiple origins comma-separated if you use a custom domain.)

---

## 4. Summary of URLs

After everything is deployed:

- **Frontend:** `https://<project-name>.pages.dev` (Cloudflare Pages)
- **Backend:** `https://fashion-ai-backend.onrender.com` (Render) — frontend calls this via `VITE_API_BASE_URL`
- **ML:** `https://fashion-ai-ml.onrender.com` (Render) — backend calls this via `ML_SERVICE_URL`

The frontend only talks to the backend. The backend talks to MongoDB Atlas, Cloudinary, Auth0, and the ML service.

---

## 5. Render free tier notes

- **Spindown:** Free web services sleep after ~15 minutes of no traffic. The first request after sleep can take 30–60 seconds (cold start).
- **Hours:** 750 hours/month per service. Two services = 750 each; usually enough for a demo or light use.
- **ML memory:** 512 MB can be tight for TensorFlow + ViT. If the ML service restarts or OOMs, try loading only the CNN in the app, or use a paid instance with more RAM.

---

## 6. Optional: Custom domains

- **Cloudflare Pages:** Add a custom domain in Pages → Custom domains.
- **Render:** Backend and ML services can get custom domains in Render → Service → Settings → Custom Domain (e.g. `api.yourdomain.com`, `ml.yourdomain.com`). Update `VITE_API_BASE_URL` and `ML_SERVICE_URL` and Auth0 URLs accordingly.

---

## 7. Checklist

- [ ] ML service deployed on Render; URL noted.
- [ ] Backend deployed on Render with `ML_SERVICE_URL`, `MONGODB_URI`, Auth0, Cloudinary, and (after frontend) `CORS_ORIGINS`.
- [ ] Frontend deployed on Cloudflare Pages with `VITE_API_BASE_URL` and Auth0 vars.
- [ ] Auth0: Callback/Logout/Web Origins include the Pages URL.
- [ ] Backend CORS includes the frontend origin.
