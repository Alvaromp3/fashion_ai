# Setup checklist — Path B (HF Space + Render + Pages + R2)

Do these in order. When you’re done, the app will be live at your Cloudflare Pages URL.

---

## 1. Hugging Face Space (ML) — already done

- [ ] Space **Jobersteadt/fashion-ai-ml** is built and running.
- [ ] Note the URL: `https://Jobersteadt-fashion-ai-ml.hf.space` (use this as `ML_SERVICE_URL`).
- [ ] Optional ViT Space: **Jobersteadt/fashion-ai-ml-vit** → `ML_VIT_SERVICE_URL`.

---

## 2. Cloudflare R2 (image storage)

**Option A — CLI (Wrangler):** From repo root run `npm run cloudflare:r2-create` (see [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md)). Then create the R2 API token in the dashboard (step 2 below).

**Option B — Dashboard only:**

1. [ ] [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket** → name e.g. `fashion-ai-uploads`.
2. [ ] **Manage R2 API Tokens** → **Create API token** → name `fashion-ai`, **Object Read & Write** for this bucket → Create.
3. [ ] Copy **Access Key ID**, **Secret Access Key**. Note **Account ID** (dashboard URL or Overview).
4. [ ] Bucket → **Settings** → enable **Public access** if you want public image URLs; note the public URL (e.g. `https://pub-xxxx.r2.dev`).

You’ll add these to the **backend** in step 4:

| Variable | Value |
|----------|--------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | From the API token |
| `R2_SECRET_ACCESS_KEY` | From the API token |
| `R2_BUCKET_NAME` | `fashion-ai-uploads` |
| `R2_PUBLIC_URL` | e.g. `https://pub-xxxx.r2.dev` (no trailing slash) |

---

## 3. MongoDB Atlas

- [ ] Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) if you don’t have one.
- [ ] Get the **connection string** (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/fashion_ai`). You’ll set it as `MONGODB_URI` on the backend.

---

## 4. Auth0

- [ ] [Auth0 Dashboard](https://manage.auth0.com) → **Applications** → create or use a **Single Page Application**.
- [ ] Note **Domain**, **Client ID**. Create an **API** with identifier e.g. `https://fashion-ai-api` → use as **Audience**.
- [ ] You’ll add **Callback**, **Logout**, **Web Origins** in step 6 (after you have the Pages URL).

---

## 5. Render — backend only

1. [ ] [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. [ ] Connect your **GitHub** repo and choose **fashion_ai**.
3. [ ] Set **Blueprint path** to **`render-backend-only.yaml`** (so Render deploys only the backend; ML is on HF).
4. [ ] After the service is created, open **fashion-ai-backend** → **Environment** and add:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your MongoDB connection string |
| `AUTH0_DOMAIN` | Auth0 domain (e.g. `dev-xxx.us.auth0.com`) |
| `AUTH0_AUDIENCE` | e.g. `https://fashion-ai-api` |
| `ML_SERVICE_URL` | `https://Jobersteadt-fashion-ai-ml.hf.space` (no trailing slash) |
| `R2_ACCOUNT_ID` | From step 2 |
| `R2_ACCESS_KEY_ID` | From step 2 |
| `R2_SECRET_ACCESS_KEY` | From step 2 |
| `R2_BUCKET_NAME` | `fashion-ai-uploads` |
| `R2_PUBLIC_URL` | e.g. `https://pub-xxxx.r2.dev` (no trailing slash) |

Leave **`CORS_ORIGINS`** empty for now — you’ll set it in step 7 after the frontend is deployed.

Optional:

- `ML_VIT_SERVICE_URL` = your ViT Space URL if you use it.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` if you prefer Cloudinary over R2.
- `OPENROUTER_API_KEY` for Mirror AI features.

5. [ ] **Save**. Render will deploy. Note the backend URL, e.g. `https://fashion-ai-backend.onrender.com`.

---

## 6. Cloudflare Pages — frontend

1. [ ] [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. [ ] Select the **fashion_ai** repo.
3. [ ] Build settings:
   - **Build command:** `cd frontend && npm ci && npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** leave empty.
4. [ ] **Save and Deploy**. Wait for the first build.
5. [ ] Note your **Pages URL**, e.g. `https://fashion-ai-xxxx.pages.dev`.
6. [ ] **Settings** → **Environment variables** (Production). Add:

| Name | Value |
|------|--------|
| `VITE_AUTH0_DOMAIN` | Same as backend `AUTH0_DOMAIN` |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA Client ID |
| `VITE_AUTH0_AUDIENCE` | Same as `AUTH0_AUDIENCE` |
| `VITE_AUTH0_CALLBACK_URL` | Your **Pages URL** (e.g. `https://fashion-ai-xxxx.pages.dev`) — no trailing slash |
| `VITE_API_BASE_URL` | Your **backend URL** (e.g. `https://fashion-ai-backend.onrender.com`) — no trailing slash |

7. [ ] **Redeploy** the Pages project (trigger a new build so env vars are applied).

---

## 7. Auth0 URLs + backend CORS

1. [ ] **Auth0** → your **Application (SPA)** → **Settings**:
   - **Allowed Callback URLs:** add your Pages URL (e.g. `https://fashion-ai-xxxx.pages.dev`)
   - **Allowed Logout URLs:** add the same
   - **Allowed Web Origins:** add the same
   - **Save**.
2. [ ] **Render** → **fashion-ai-backend** → **Environment** → add:
   - `CORS_ORIGINS` = your **Pages URL** (e.g. `https://fashion-ai-xxxx.pages.dev`)
   - **Save** (Render will redeploy).

---

## 8. HF Space CORS (optional)

- [ ] In your HF Space **Jobersteadt/fashion-ai-ml** → **Settings** → **Variables**, set `CORS_ORIGINS` to your Pages URL (or `*` for testing). The Space app already reads this.

---

## Done

- **App:** open your **Cloudflare Pages URL** and log in with Auth0.
- **Cost:** see [COST_AND_LIMITS.md](COST_AND_LIMITS.md) to stay on free tiers.

If something fails, check **Render Logs**, **Pages Build logs**, and **Auth0** callback/origins.
