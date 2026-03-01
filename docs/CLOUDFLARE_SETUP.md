# Cloudflare setup with Wrangler (CLI)

Cloudflare’s official **Wrangler** CLI lets you create R2 buckets and deploy Pages from the terminal. No dashboard required for bucket creation or deploy; you still create **R2 API tokens** (for the backend) in the dashboard once.

---

## 1. Install and log in

You don’t need to add Wrangler to the project: run it with **npx**.

**Log in (one time):**

```bash
npx wrangler login
```

A browser window opens to authenticate with Cloudflare. For **CI or headless** use, set:

- `CLOUDFLARE_API_TOKEN` — [Create API Token](https://dash.cloudflare.com/profile/api-tokens) with “Edit Cloudflare Workers” + “Cloudflare R2” (or “Account Settings” read).
- `CLOUDFLARE_ACCOUNT_ID` — from the dashboard URL or **Overview** for your account.

---

## 2. Create the R2 bucket

From the **repo root**:

```bash
npm run cloudflare:r2-create
```

Or directly:

```bash
npx wrangler r2 bucket create fashion-ai-uploads
```

This creates the bucket. **R2 API credentials** (for the backend’s S3-compatible client) are **not** created by Wrangler; create them in the dashboard (see below).

### What the R2 API token gives you

When you create an **R2 API token** in the dashboard (R2 → **Manage R2 API Tokens** → **Create API token**, name `fashion-ai`, **Object Read & Write** for bucket `fashion-ai-uploads`), Cloudflare shows **once**:

| What Cloudflare shows | Put it in backend as |
|-----------------------|------------------------|
| **Access Key ID** (long string) | `R2_ACCESS_KEY_ID` |
| **Secret Access Key** (long string) | `R2_SECRET_ACCESS_KEY` |

You also need (not part of the token):

| Value | Where to get it | Backend env |
|-------|------------------|-------------|
| Account ID | Dashboard URL or R2/Overview | `R2_ACCOUNT_ID` |
| Bucket name | You chose it, e.g. `fashion-ai-uploads` | `R2_BUCKET_NAME` |
| Public URL (optional) | Bucket → Settings → Public access | `R2_PUBLIC_URL` |

### Where to put them

- **Local backend:** in `backend/.env` (same file as `MONGODB_URI`, `AUTH0_DOMAIN`, etc.). Add lines like:
  ```env
  R2_ACCOUNT_ID=your-account-id-hex
  R2_ACCESS_KEY_ID=the-access-key-id-from-dashboard
  R2_SECRET_ACCESS_KEY=the-secret-access-key-from-dashboard
  R2_BUCKET_NAME=fashion-ai-uploads
  R2_PUBLIC_URL=https://pub-xxxx.r2.dev
  ```
- **Production (Render):** in **Render Dashboard** → your **fashion-ai-backend** service → **Environment** → add the same keys and values. Never commit the secret to Git.

Steps in the dashboard:

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Manage R2 API Tokens** → **Create API token**.
2. Name: `fashion-ai`, permission: **Object Read & Write**, scope to bucket `fashion-ai-uploads`.
3. Copy **Access Key ID** and **Secret Access Key** (secret is shown once) into backend env as above.
4. **Account ID** → `R2_ACCOUNT_ID`; bucket name → `R2_BUCKET_NAME`.
5. Optional: bucket **Settings** → enable **Public access** and set that URL as `R2_PUBLIC_URL`.

---

## 3. Deploy frontend to Pages (Direct Upload)

Build the frontend and deploy to Cloudflare Pages:

```bash
npm run cloudflare:pages-deploy
```

First time only, create the project if it doesn’t exist:

```bash
npx wrangler pages project create fashion-ai
```

Then run `npm run cloudflare:pages-deploy` again.

**Environment variables** (e.g. `VITE_AUTH0_DOMAIN`, `VITE_API_BASE_URL`) can be set via CLI or dashboard:

- **CLI (from repo root):** Put your production values in `frontend/.env` or `frontend/.env.production` (only `VITE_*` keys are used). Then run:
  ```bash
  npm run cloudflare:pages-env
  ```
  This runs `wrangler pages secret bulk` to push those vars to the **fashion-ai** Pages project. After that, redeploy (e.g. `npm run cloudflare:pages-deploy` or push to Git) so the next build uses the new vars.

- **Dashboard:** **Workers & Pages** → **fashion-ai** → **Settings** → **Environment variables** (Production). After adding or changing vars, redeploy.

To use a different project name, set `CLOUDFLARE_PAGES_PROJECT_NAME` (e.g. `export CLOUDFLARE_PAGES_PROJECT_NAME=my-pages`).

**Alternative:** Use **Git integration** instead of Direct Upload: connect the repo in **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, and set build command / output directory and env vars there. Then deploys happen on push; you don’t need Wrangler for deploy.

---

## 4. What’s in this repo

| Item | Purpose |
|------|--------|
| **wrangler.toml** | Project name and (optional) `account_id` for Wrangler commands. |
| **scripts/cloudflare-r2-create.js** | Runs `wrangler r2 bucket create fashion-ai-uploads`. |
| **scripts/cloudflare-pages-deploy.js** | Builds frontend and runs `wrangler pages deploy frontend/dist --project-name fashion-ai`. |
| **scripts/cloudflare-pages-env.js** | Pushes `VITE_*` from frontend/.env to Pages via `wrangler pages secret bulk`. |
| **scripts/cloudflare-r2-create.ps1** / **.sh** | Same R2 create step with printed next steps (create API token in dashboard). |
| **scripts/cloudflare-pages-deploy.ps1** / **.sh** | Same Pages deploy with project create hint. |

**npm scripts (from repo root):**

- `npm run cloudflare:r2-create` — create R2 bucket.
- `npm run cloudflare:pages-deploy` — build frontend and deploy to Pages.
- `npm run cloudflare:pages-env` — push frontend `VITE_*` env vars to Cloudflare Pages (then redeploy).

---

## 5. R2 storage safeguard (optional)

To **block uploads** when your R2 bucket would exceed the free 10 GB (so you never get charged), the backend can check current storage via Cloudflare’s GraphQL Analytics API:

1. Create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with **Account** → **Account Analytics** → **Read**.
2. In backend env set:
   - `CLOUDFLARE_API_TOKEN` = that token
   - `R2_SOFT_LIMIT_BYTES` = e.g. `9500000000` (9.5 GB; optional)
3. With these set, any upload that would push the bucket over the limit returns **429** and no file is written. If you don’t set the token, the app does not enforce this cap (other safeguards like **PRENDAS_MAX_PER_USER** and rate limits still apply). See [COST_AND_LIMITS.md](COST_AND_LIMITS.md#3-r2-storage-cloudflare-api-check).

**Cloudflare-side protections** (don’t add a payment method, optional cron check): see **[CLOUDFLARE_PROTECTIONS.md](CLOUDFLARE_PROTECTIONS.md)**.

---

## 6. References

- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — Cloudflare CLI.
- [R2 with Wrangler](https://developers.cloudflare.com/r2/get-started/cli/) — create buckets, put/get objects.
- [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) — deploy with `wrangler pages deploy`.
- [R2 API tokens (S3)](https://developers.cloudflare.com/r2/api/tokens/) — create in dashboard for backend `R2_*` env vars.
- [GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/) — used by the backend to enforce R2 storage cap when `CLOUDFLARE_API_TOKEN` is set.
