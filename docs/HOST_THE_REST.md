# Host the rest (backend + frontend)

ML is already on **Hugging Face**. Use this order to get the **backend** and **frontend** live.

---

## Before you start

Have these ready:

- **MongoDB** – Connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free M0).
- **Auth0** – [Auth0](https://manage.auth0.com): SPA app + API; note **Domain**, **Client ID**, **Audience**.
- **R2** (optional but recommended) – Bucket + API token; see [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md#2-cloudflare-r2-image-storage) or `npm run cloudflare:r2-create` then create token in dashboard.
- **GitHub** – This repo pushed (so Render and Pages can connect).

---

## 1. Backend on Render (~5 min)

1. Go to **[dashboard.render.com](https://dashboard.render.com)** → **New** → **Blueprint**.
2. Connect **GitHub** and select the repo that contains this project.
3. Set **Blueprint path** to **`render-backend-only.yaml`** → Continue.
4. After the service is created, open **fashion-ai-backend** → **Environment** and add:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your MongoDB connection string |
| `AUTH0_DOMAIN` | e.g. `dev-xxxx.us.auth0.com` |
| `AUTH0_AUDIENCE` | e.g. `https://fashion-ai-api` |
| `ML_SERVICE_URL` | `https://Jobersteadt-fashion-ai-ml.hf.space` |
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | From R2 API token |
| `R2_SECRET_ACCESS_KEY` | From R2 API token |
| `R2_BUCKET_NAME` | `fashion-ai-uploads` |
| `R2_PUBLIC_URL` | e.g. `https://pub-xxxx.r2.dev` (no trailing slash) |

Leave **`CORS_ORIGINS`** empty for now.

5. **Save**. Wait for deploy. Copy the backend URL, e.g. **`https://fashion-ai-backend.onrender.com`**.

---

## 2. Frontend on Cloudflare Pages (~5 min)

**Option A — Dashboard (recommended):** Connect Git so every push deploys and env vars are used at build time.

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the repo. Build settings:
   - **Build command:** `cd frontend && npm ci && npm run build`
   - **Build output directory:** `frontend/dist`
3. **Save and Deploy**. Wait for the first build.
4. Copy your **Pages URL**, e.g. **`https://fashion-ai-xxxx.pages.dev`**.
5. **Settings** → **Environment variables** (Production). Add:

| Name | Value |
|------|--------|
| `VITE_AUTH0_DOMAIN` | Same as backend `AUTH0_DOMAIN` |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA Client ID |
| `VITE_AUTH0_AUDIENCE` | Same as `AUTH0_AUDIENCE` |
| `VITE_AUTH0_CALLBACK_URL` | Your **Pages URL** (no trailing slash) |
| `VITE_API_BASE_URL` | Your **backend URL** from step 1 (no trailing slash) |

6. **Redeploy** (e.g. **Deployments** → **⋯** → **Retry deployment**) so the new env vars are used.

**Option B — CLI:** If the project **fashion-ai** already exists (e.g. created via dashboard or `npx wrangler pages project create fashion-ai`), from repo root run:

```bash
npm run cloudflare:pages-deploy
```

Then add the **Environment variables** above in **Workers & Pages** → **fashion-ai** → **Settings** and run `npm run cloudflare:pages-deploy` again (Vite bakes env vars at build time, so rebuild + deploy after changing them).

**Live URL:** Your app will be at **https://fashion-ai.pages.dev** (or the URL shown after deploy).

---

## 3. Auth0 + CORS (~2 min)

1. **Auth0** → Your SPA application → **Settings**:
   - **Allowed Callback URLs:** add your Pages URL
   - **Allowed Logout URLs:** add the same
   - **Allowed Web Origins:** add the same  
   → **Save**.
2. **Render** → **fashion-ai-backend** → **Environment** → add:
   - **`CORS_ORIGINS`** = your **Pages URL** (exact, no trailing slash)  
   → **Save** (Render will redeploy).

---

## Done

Open your **Cloudflare Pages URL** and log in. Full checklist: [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md).
