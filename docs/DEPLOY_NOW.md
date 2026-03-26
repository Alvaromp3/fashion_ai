# Deploy Fashion AI — step-by-step

Choose one path. **Path A** is fastest (everything on Render + Pages). **Path B** is the recommended free stack (HF Space for ML, R2 for images).

---

## Path A: Fastest (Render + Cloudflare Pages)

**You need:** GitHub repo pushed, MongoDB Atlas URI, Auth0 app, Cloudinary (or skip and use local uploads). Model files in a GitHub Release (see below).

### 1. Push your code and create a GitHub Release (for model files)

- Push the project to GitHub if you haven’t.
- The classifier uses only **`best_model_17_marzo.keras`** (ViT). It is not committed to Git; publish it via **`./scripts/publish-models-release.sh`** or attach **`best_model_17_marzo.keras`** (or **`vit_model_v1.zip`** with a `.keras` inside) to a GitHub Release (e.g. tag `models-v1.0`).
- Optional admin assets (`model_metrics*.json`, confusion-matrix PNGs, `data_audit.png`) are not required for inference; add them only if you extend the Dockerfile to `COPY` them.

### 2. Deploy ML + Backend on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your **GitHub** account and select the **fashion_ai** repo.
3. Render reads `render.yaml` and shows two services: **fashion-ai-ml** and **fashion-ai-backend**.
4. **fashion-ai-ml** (deploy this first):
   - Open the service.
   - **Environment** → Add:
     - `GITHUB_REPO` = `YOUR_GITHUB_USERNAME/fashion_ai`
     - `MODELS_RELEASE_TAG` = `models-v1.0` (or your release tag)
     - If the repo is private: `GITHUB_TOKEN` = a GitHub Personal Access Token with `repo`.
   - Click **Create resources** / **Deploy**. Wait for the build (Docker can take several minutes).
   - Copy the service URL, e.g. `https://fashion-ai-ml.onrender.com`.
5. **fashion-ai-backend**:
   - Open the service.
   - **Environment** → Add (use your real values):

     | Key | Value |
     |-----|--------|
     | `MONGODB_URI` | Your MongoDB Atlas connection string |
     | `AUTH0_DOMAIN` | e.g. `dev-xxxx.us.auth0.com` |
     | `AUTH0_AUDIENCE` | e.g. `https://fashion-ai-api` |
     | `ML_SERVICE_URL` | `https://fashion-ai-ml.onrender.com` (from step 4) |
     | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name (or leave empty to use local uploads) |
     | `CLOUDINARY_API_KEY` | (if using Cloudinary) |
     | `CLOUDINARY_API_SECRET` | (if using Cloudinary) |
     | `OPENROUTER_API_KEY` | (optional) |

   - Deploy. Copy the backend URL, e.g. `https://fashion-ai-backend.onrender.com`.
   - **Do not set `CORS_ORIGINS` yet** — you’ll add it after the frontend is live.

### 3. Deploy frontend on Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the **fashion_ai** repo.
3. **Build settings:**
   - **Framework preset:** None
   - **Build command:** `cd frontend && npm ci && npm run build`
   - **Build output directory:** `frontend/dist`
4. **Save and Deploy**. Wait for the first build.
5. After deploy, note your **Pages URL**, e.g. `https://fashion-ai-123.pages.dev`.

### 4. Set frontend and Auth0 URLs

1. **Cloudflare Pages** → your project → **Settings** → **Environment variables** (Production). Add:

   | Name | Value |
   |------|--------|
   | `VITE_AUTH0_DOMAIN` | Same as backend `AUTH0_DOMAIN` |
   | `VITE_AUTH0_CLIENT_ID` | Your Auth0 SPA **Client ID** |
   | `VITE_AUTH0_AUDIENCE` | Same as `AUTH0_AUDIENCE` |
   | `VITE_AUTH0_CALLBACK_URL` | Your Pages URL, e.g. `https://fashion-ai-123.pages.dev` |
   | `VITE_API_BASE_URL` | Your backend URL, e.g. `https://fashion-ai-backend.onrender.com` |

2. **Redeploy** the Pages project (trigger a new build so vars are applied).
3. **Auth0 Dashboard** → your **Application (SPA)** → **Settings**:
   - **Allowed Callback URLs:** add `https://fashion-ai-123.pages.dev`
   - **Allowed Logout URLs:** add `https://fashion-ai-123.pages.dev`
   - **Allowed Web Origins:** add `https://fashion-ai-123.pages.dev`
   - Save.
4. **Render** → **fashion-ai-backend** → **Environment** → add:
   - `CORS_ORIGINS` = `https://fashion-ai-123.pages.dev` (your exact Pages URL)
   - Save. Render will redeploy.

### 5. Done (Path A)

- **App:** open your Pages URL and log in with Auth0.
- **Backend** may sleep after 15 min idle; first request can take 30–60 s (cold start).

---

## Path B: Recommended (HF Space + Render + Pages + R2)

**Step-by-step checklist:** Use **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** for a single ordered list (R2 → Render → Pages → Auth0/CORS) with every env var and where to set it.

**You need:** Same as Path A, plus a Hugging Face account and a Cloudflare account (for R2).

### 1. Hugging Face Space (ML)

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) → **Create new Space**.
2. **Space name:** e.g. `fashion-ai-ml`. **SDK:** **Docker**. **Create**.
3. In the Space repo you’ll upload or add files. Prefer the repo’s **`hf-space/Dockerfile`** (build context: **repository root**): it copies `ml-service/` and downloads **`best_model_17_marzo.keras`** from your GitHub Release or **`HF_VIT_URL`**.

4. **Environment:** `ML_VIT_PATH=/app/models/best_model_17_marzo.keras` (set by the Dockerfile).

5. Ensure the build can obtain **`best_model_17_marzo.keras`** (release asset, zip, or public `HF_VIT_URL`).
6. **Space → Settings → Variables:** `CORS_ORIGINS` = `*` for testing (or your Pages URL later).
7. Wait for the Space to **build and run**. Copy the Space URL, e.g. `https://YOUR_USERNAME-fashion-ai-ml.hf.space`.

### 2. Cloudflare R2 (images)

1. **Cloudflare Dashboard** → **R2** → **Create bucket** → name e.g. `fashion-ai-uploads` → Create.
2. **Manage R2 API Tokens** → **Create API token** → name e.g. `fashion-ai`, **Object Read & Write** for this bucket → Create. Copy **Access Key ID** and **Secret Access Key**.
3. **Bucket → Settings:** enable **Public access** if available and note the public URL (e.g. `https://pub-xxxx.r2.dev`), or use a custom domain later. You need a base URL for `R2_PUBLIC_URL`.
4. Note your **Account ID** (Cloudflare dashboard URL or Overview).

### 3. Backend on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** (not Blueprint this time, so you only deploy the backend).
2. Connect the **fashion_ai** repo.
3. **Settings:**
   - **Name:** `fashion-ai-backend`
   - **Root Directory:** `backend`
   - **Build command:** `npm ci`
   - **Start command:** `npm start`
   - **Instance type:** Free.
4. **Environment** — add (use your real values):

   | Key | Value |
   |-----|--------|
   | `MONGODB_URI` | MongoDB Atlas URI |
   | `AUTH0_DOMAIN` | Auth0 domain |
   | `AUTH0_AUDIENCE` | Auth0 audience |
   | `ML_SERVICE_URL` | Your **HF Space URL** (e.g. `https://YOUR_USERNAME-fashion-ai-ml.hf.space`) |
   | `R2_ACCOUNT_ID` | Cloudflare account ID |
   | `R2_ACCESS_KEY_ID` | R2 API token access key |
   | `R2_SECRET_ACCESS_KEY` | R2 API token secret |
   | `R2_BUCKET_NAME` | `fashion-ai-uploads` |
   | `R2_PUBLIC_URL` | e.g. `https://pub-xxxx.r2.dev` (no trailing slash) |
   | `OPENROUTER_API_KEY` | (optional) |

5. **Create Web Service**. Copy the backend URL, e.g. `https://fashion-ai-backend.onrender.com`.  
   **Do not set `CORS_ORIGINS` yet.**

### 4. Frontend on Cloudflare Pages

Same as Path A, steps 3–4:

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → select **fashion_ai**.
2. **Build command:** `cd frontend && npm ci && npm run build`  
   **Build output directory:** `frontend/dist`
3. Deploy, then add **Environment variables** (Production):
   - `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
   - `VITE_AUTH0_CALLBACK_URL` = your Pages URL
   - `VITE_API_BASE_URL` = your Render backend URL
4. Redeploy. Note the **Pages URL**.
5. **Auth0:** add the Pages URL to Callback, Logout, Web Origins.
6. **Render** → **fashion-ai-backend** → **Environment** → `CORS_ORIGINS` = your Pages URL → Save.

### 5. Done (Path B)

- **App:** your Pages URL. ML runs on the HF Space (16 GB RAM), images go to R2 (no egress cost).
- Backend on Render may cold-start after idle; ML on the Space does not have the same limits.

---

## Quick reference

| What | Path A | Path B |
|------|--------|--------|
| **ML** | Render (Docker, 512 MB) | Hugging Face Space (16 GB) |
| **Backend** | Render | Render |
| **Frontend** | Cloudflare Pages | Cloudflare Pages |
| **Images** | Cloudinary or local | R2 (or Cloudinary if R2 not set) |
| **Docs** | [FREE_HOSTING.md](FREE_HOSTING.md) | [HF_SPACES_CLOUDFLARE_R2.md](HF_SPACES_CLOUDFLARE_R2.md) |

If something fails, check the service logs (Render **Logs**, HF Space **Logs**, Pages **Build** and **Functions** if used) and the env vars above.

**Cost and staying free:** See **[COST_AND_LIMITS.md](COST_AND_LIMITS.md)** for limits and a “stay free” checklist.
