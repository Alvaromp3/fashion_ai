# Best free stack: Hugging Face Spaces + Cloudflare Pages + R2

This is the **recommended free architecture** for Fashion AI:

| Layer | Service | Why |
|-------|---------|-----|
| **Frontend** | **Cloudflare Pages** | Unlimited static assets, global CDN, no egress cost |
| **Image storage** | **Cloudflare R2** | Free quota, **no egress charges** (unlike S3) |
| **ML inference** | **Hugging Face Spaces** | ~2 vCPU, **16 GB RAM** — enough for CNN + ViT, no cold-start hours limit |
| **Backend API** | **Render** (or optional minimal Worker) | Auth, MongoDB, proxies to Space; or use a tiny serverless proxy |

---

## Why this trio wins

- **Models fit in RAM:** 16 GB on the Space handles your CNN (~22 MB) and ViT (~50–200 MB) without OOM.
- **No Render ML cold starts** — the Space stays warm; no 512 MB limit.
- **No monthly “hours” bucket** — Spaces free tier is always-on for the session.
- **~100s of requests/day** for free; R2 free tier is generous and has **zero egress**.
- **Backend** can call the Space at `https://<your-space>.hf.space` (or use a Space “API” URL if you enable it).

---

## 1. Hugging Face Space (ML inference)

Your repo already has a **FastAPI** app for Spaces in `ml-service/space_app.py`. It exposes the same contract as the Flask app (`/classify`, `/classify-vit`, `/health`) so the backend only needs to point `ML_SERVICE_URL` at the Space.

### Option A: Deploy from this repo (Space in same repo)

1. Create a **new Space** at [huggingface.co/spaces](https://huggingface.co/spaces) → **Create new Space**.
2. **SDK:** choose **Gradio** or **Docker** (we’ll run FastAPI via Docker or a custom `Dockerfile`).
3. **Docker deployment (recommended):**
   - In the Space, add a `Dockerfile` that:
     - Uses a Python image, installs `requirements.txt` from `ml-service/`.
     - Copies `ml-service/` (or at least `app.py`, `space_app.py`, and model files or a download step).
     - Runs `uvicorn space_app:app --host 0.0.0.0 --port 7860`.
   - HF Spaces use port **7860** by default.
4. **Model files:** put `modelo_ropa.h5` and `vision_transformer_moda_modelo.keras` in the Space (e.g. upload to “Files and versions” or download in Docker from your GitHub Release). Same as for Render: use `ML_CNN_PATH` / `ML_VIT_PATH` if you place them in a custom path.
5. **Environment variables** (Space → Settings → Variables):  
   `CORS_ORIGINS` = your frontend origin (e.g. `https://your-app.pages.dev`) or `*` for testing.

### Option B: Standalone Space repo (copy only ML code)

1. Create a **new HF Space** with **Docker**.
2. Copy into the Space repo:
   - `ml-service/app.py` (Flask logic; `space_app` imports from it)
   - `ml-service/space_app.py`
   - `ml-service/requirements.txt`
   - Model files (or a script to download from GitHub Release)
3. Dockerfile example:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py space_app.py ./
# Copy or download model files to /app (e.g. modelo_ropa.h5, vision_transformer_moda_modelo.keras)
ENV ML_CNN_PATH=/app/modelo_ropa.h5
ENV ML_VIT_PATH=/app/vision_transformer_moda_modelo.keras
EXPOSE 7860
CMD ["uvicorn", "space_app:app", "--host", "0.0.0.0", "--port", "7860"]
```

4. **Space URL:** after build, your API base is  
   `https://<your-username>-<space-name>.hf.space`  
   For **direct API** (no Gradio UI), HF often exposes something like  
   `https://<your-username>-<space-name>.hf.space` — use the “Use via API” or “Embed” link to get the correct base URL. Backend will call:
   - `POST .../classify` (form-data key `imagen`)
   - `POST .../classify-vit` (form-data key `imagen`)
   - `GET .../health`

### CORS

`space_app.py` already adds CORS with `CORS_ORIGINS` (or `*`). Set `CORS_ORIGINS` to your Cloudflare Pages URL in production.

### Model loading

Models are loaded **once at startup** in the FastAPI lifespan, so no per-request load — same as your note: “Load model once at server startup.”

---

## 2. Cloudflare Pages (frontend)

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. **Build:**
   - Build command: `cd frontend && npm ci && npm run build`
   - Build output directory: `frontend/dist`
3. **Environment variables:**
   - `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_AUTH0_CALLBACK_URL` (use your Pages URL, e.g. `https://your-project.pages.dev`).
   - `VITE_API_BASE_URL` = your **backend** URL (e.g. `https://fashion-ai-backend.onrender.com`). The frontend talks only to the backend; the backend talks to the Space.

---

## 3. Cloudflare R2 (image storage)

1. **R2** → **Create bucket** (e.g. `fashion-ai-uploads`).
2. **Manage R2 API Tokens** → Create token with “Object Read & Write” for this bucket. Note **Access Key ID** and **Secret Access Key**.
3. **Public access (for image URLs):**  
   Either enable “Public access” for the bucket (HF doc: R2 allows custom domain or public bucket URL like `https://pub-xxx.r2.dev`) or use a **custom domain** and set that as the base URL.
4. **Backend env (Render or wherever the API runs):**
   - `R2_ACCOUNT_ID` = your Cloudflare account ID (from dashboard URL or Overview).
   - `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` = from the API token.
   - `R2_BUCKET_NAME` = bucket name.
   - `R2_PUBLIC_URL` = public base URL (e.g. `https://pub-xxx.r2.dev` or `https://uploads.yourdomain.com`). No trailing slash.
   - Optional: `R2_FOLDER` = `fashion_ai` (default).

When these are set, the backend **prefers R2 over Cloudinary**: uploads (including `/api/prendas/upload` and `/api/prendas/auto`) go to R2; delete removes the object from R2. No egress cost for reads.

---

## 4. Backend (Render or minimal serverless)

You still need an API for:

- Auth (Auth0 JWT)
- MongoDB (prendas, outfits, user profiles)
- Calling the **Space** for classification (`ML_SERVICE_URL` = your Space API URL)
- Uploading to **R2** (already wired in when R2 env vars are set)

**Option A — Keep Render for the backend**

- Deploy the **Node backend** to Render (as in `FREE_HOSTING.md`), but set:
  - `ML_SERVICE_URL` = `https://<your-username>-<space-name>.hf.space` (or the exact Space API base URL).
  - R2 env vars above so images go to R2 instead of (or in addition to) Cloudinary.
- Frontend `VITE_API_BASE_URL` = Render backend URL.

**Option B — Minimal backend**

- If you later move to a “tiny serverless” backend (e.g. Cloudflare Worker), that Worker would:
  - Validate Auth0 JWT.
  - Proxy to the HF Space for `/classify` and `/classify-vit`.
  - Store metadata in D1 or call MongoDB Atlas from the Worker.
  - Generate R2 presigned upload URLs or proxy uploads to R2.

For now, **Option A (Render backend + HF Space + R2)** is the simplest and fits the “best free stack” you described.

---

## 5. End-to-end flow

1. **Frontend** (Cloudflare Pages) → all API calls to **Backend** (`VITE_API_BASE_URL`).
2. **Backend** → Auth0 (JWT), MongoDB (prendas/outfits), **R2** (image upload/delete), **HF Space** (classification).
3. **HF Space** → responds to `POST /classify` and `POST /classify-vit` with the same JSON as the Flask app.

---

## 6. Comparison with other free options

| Option | Free tier | Pros | Cons |
|--------|-----------|------|------|
| **Hugging Face Spaces** | Always free (with compute) | 16 GB RAM, HTTP API, good for TF/Keras | Ephemeral disk; not for very high QPS |
| **Cloudflare Workers** | Free quota | Edge, low latency | Not for heavy ML; you’d still call a Space |
| **Render free** | 750 hrs/month | Easy deploy | 512 MB RAM too small for TF + ViT; cold starts |
| **Google Colab / Kaggle** | Free notebooks | Sometimes free GPU | Not an API host; sessions expire |
| **HF Inference API** | Limited free credits | Simple HTTP API | Not free long-term |
| **Cloudflare R2** | Generous free tier | **No egress fees** | — |

---

## 7. Checklist

- [ ] HF Space created; Dockerfile runs `uvicorn space_app:app --host 0.0.0.0 --port 7860`; models available; `CORS_ORIGINS` set.
- [ ] Space URL noted (e.g. `https://xxx.hf.space`).
- [ ] Backend (e.g. Render) deployed with `ML_SERVICE_URL` = Space URL, R2 env vars set, MongoDB + Auth0 configured.
- [ ] Cloudflare Pages: frontend built with `VITE_API_BASE_URL` = backend URL and Auth0 vars.
- [ ] Auth0: Callback / Logout / Web Origins include the Pages URL.
- [ ] R2 bucket created; public URL or custom domain set as `R2_PUBLIC_URL`.

Once this is done, you have **Hugging Face Spaces (FastAPI) + Cloudflare Pages + Cloudflare R2** as the main free stack, with an optional Render (or other) backend to tie them together.
