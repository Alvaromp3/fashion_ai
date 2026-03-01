# Environment variables checklist

**Production URLs for this project:**
- **Frontend:** https://fashion-ai.pages.dev
- **Backend:**  https://fashion-ai-backend-c6wd.onrender.com
- **ML (HF):**  https://jobersteadt-fashion-ai-ml.hf.space

**Single source of truth:** All env is in the **dotenv vault**. Pull prod: `npm run env:vault-pull`. Pull dev: `npm run env:vault-pull:dev`. Push prod: `npm run env:vault-push`. Push dev: `npm run env:vault-push:dev`. See [DOTENV_VAULT.md](DOTENV_VAULT.md).

---

## Backend (`backend/.env`)

| Variable | Local | Production (Render) | Notes |
|----------|--------|---------------------|--------|
| `MONGODB_URI` | ✓ | ✓ | Atlas URL; last occurrence in .env wins if duplicated |
| `AUTH0_DOMAIN` | ✓ | ✓ | e.g. `dev-xxx.us.auth0.com` |
| `AUTH0_AUDIENCE` | ✓ | ✓ | e.g. `https://fashion-ai-api` |
| `ML_SERVICE_URL` | ✓ | ✓ | **Production:** your HF Space URL (e.g. `https://YOUR_USER-fashion-ai-ml.hf.space`). Required so ML status and “wake Space” hint work. |
| `PORT` | 4000 | — | Omit on Render (script skips it); Render sets `PORT` itself. |
| `CORS_ORIGINS` | localhost:3000 | Optional | Backend uses permissive CORS by default; set if you add origin checks later. |
| `R2_*` or `CLOUDINARY_*` | Optional | ✓ | One set for image uploads in production. |
| `OPENROUTER_API_KEY` | Optional | Optional | For Mirror / AI features. |
| `RENDER_API_KEY` | For scripts | — | Only for `npm run render:env`; not sent to Render. |
| `RENDER_SERVICE_ID` | For scripts | — | e.g. `srv-xxx`; optional if Render CLI is used to resolve by name. |

**Sync backend → Render:** `npm run render:env` (or `npm run env:sync-render` after dotenv-vault pull). Then redeploy: `npm run render:deploy`.

---

## Frontend (local: `frontend/.env`; production: Cloudflare Pages)

| Variable | Local | Production (Pages) | Notes |
|----------|--------|----------------------|--------|
| `VITE_AUTH0_DOMAIN` | ✓ | ✓ | Same as backend `AUTH0_DOMAIN`. |
| `VITE_AUTH0_CLIENT_ID` | ✓ | ✓ | Auth0 SPA application Client ID. |
| `VITE_AUTH0_AUDIENCE` | ✓ | ✓ | Same as backend `AUTH0_AUDIENCE`. |
| `VITE_AUTH0_CALLBACK_URL` | `http://localhost:3000` | **Your Pages URL** (e.g. `https://fashion-ai.pages.dev`) | No trailing slash. |
| `VITE_API_BASE_URL` | Empty for dev (proxy) | **Backend URL** (e.g. `https://fashion-ai-backend-c6wd.onrender.com`) | **Required in prod** or the frontend will call the wrong host and show “ML not available” / API errors. |

**Push frontend env to Pages:** After `env:vault-pull`, `frontend/.env` has production values. Run `npm run cloudflare:pages-env`, then redeploy the frontend so the new vars are baked in.

---

## Quick checks

1. **Backend on Render** – In Render logs you should see: Auth0 configured, Cloudinary or R2 configured, OpenRouter if set, ML server reachable at your HF Space URL. If you see “ML_SERVICE_URL not set” or “localhost:6001”, run `npm run render:env` and redeploy.
2. **Frontend “ML not available”** – Ensure Cloudflare Pages has `VITE_API_BASE_URL` set to your Render backend URL and that you redeployed after setting it.
3. **Auth0 login redirect** – In Auth0 Application settings, add your **Pages URL** to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins.
4. **Duplicate keys in `.env`** – If a key appears twice, the **last** value wins. Keep one value per key or use a “Production overrides” section at the bottom.

---

## Upload garment not working? (production)

| Symptom | Cause | Fix |
|--------|--------|-----|
| "Please log in to upload garments" or 401 | Auth0 is on; user not signed in | Log in via the app's login button, then try upload again. |
| "Can't reach the backend" / Network Error / 404 on Save | Frontend calling wrong host (e.g. Pages instead of backend) | Set **Cloudflare Pages** env `VITE_API_BASE_URL` to your backend URL (no trailing slash). Run `npm run cloudflare:pages-env` from repo root, then **redeploy** the frontend so the build gets the variable. |
| "ML service not available" / can't click Classify or it fails | ML (HF Space) asleep or `ML_SERVICE_URL` wrong | Open your HF Space URL in a browser to wake it; in Render, set `ML_SERVICE_URL` to that URL and redeploy. Upload needs Classify to succeed before Save is enabled. |
| Save succeeds but image missing later | Backend has no Cloudinary/R2; Render disk is ephemeral | Configure **Cloudinary** or **R2** on the backend (Render env) so uploads are stored in the cloud. |
