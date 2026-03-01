# Cost and limits — staying free

This doc summarizes **what’s free**, **hard limits**, and **how to avoid charges** for the Fashion AI stack (HF Space + Render + Cloudflare Pages + R2).

---

## Quick summary

| Service | Cost | Main limits | How to stay free |
|--------|------|-------------|-------------------|
| **Hugging Face Space** (ML) | **$0** | CPU Basic: 2 vCPU, 16 GB RAM; sleeps after 48h idle | Use **CPU Basic** only; don’t enable paid hardware (CPU Upgrade / GPU) |
| **Render** (backend) | **$0** | 750 hrs/month, 512 MB, sleeps after 15 min | One free web service; don’t upgrade to paid instance |
| **Cloudflare Pages** (frontend) | **$0** | 500 builds/mo, 20k files/site; static requests unlimited | Stay under 500 builds; don’t use paid Workers beyond free quota |
| **Cloudflare R2** (images) | **$0** | 10 GB storage, 1M Class A + 10M Class B ops/mo; **egress free** | Stay under 10 GB and within op limits |
| **MongoDB Atlas** | **$0** | M0: 512 MB, shared | Don’t upgrade cluster |
| **Auth0** | **$0** | Free tier (e.g. 7k MAU) | Stay within free MAU |

**Total to run this stack in “free mode”: $0/month**, as long as you stay within the limits below.

---

## 1. Hugging Face Spaces (ML)

- **Free tier:** **CPU Basic** — 2 vCPU, **16 GB RAM**, 50 GB non-persistent disk. No per-user request quota for CPU.
- **Sleep:** Space sleeps after **48 hours** of no visits; next request wakes it (may take ~30–60 s).
- **Cost:** $0 for CPU Basic. **Do not** turn on “CPU Upgrade” or any GPU (T4, A10G, A100, etc.) in Space settings — those are **paid** ($0.03/hr and up).
- **How to stay free:**
  - In the Space → **Settings** → **Hardware**, leave it on **CPU Basic** (default).
  - Don’t enable **ZeroGPU** or other GPU/upgrade options unless you accept paid or quota limits (ZeroGPU free = 3.5 min/day).

**References:** [Spaces overview](https://huggingface.co/docs/hub/en/spaces-overview), [HF Pricing](https://huggingface.co/pricing).

---

## 2. Render (backend)

- **Free tier:** **750 hours per month** per free web service; **512 MB RAM**, 0.1 CPU; custom domains, logs, PR previews.
- **Spindown:** Service sleeps after **~15 minutes** of no traffic; first request after sleep can take **30–60 seconds** (cold start).
- **Cost:** $0 as long as you don’t exceed 750 hrs and don’t upgrade. One free web service is enough for the backend (ML is on HF).
- **How to stay free:**
  - Use only **one** free Web Service for the backend (fashion-ai-backend). Don’t run a second free ML service on Render if you’re using the HF Space.
  - In Render Dashboard → service → **Settings** → ensure **Instance type** is **Free**.
  - Don’t add paid instances or databases beyond free PostgreSQL (and we use MongoDB Atlas, not Render Postgres).

**References:** [Render Free Tier](https://render.com/docs/free), [Render Pricing](https://render.com/pricing).

---

## 3. Cloudflare Pages (frontend)

- **Free tier:** **500 builds per month**; **20,000 files** per site; **25 MiB** max per file; **unlimited** requests for static assets. No bandwidth charges for static.
- **Cost:** $0 for typical static sites. If you use **Pages Functions**, those count toward Workers free plan (100k requests/day).
- **How to stay free:**
  - Avoid unnecessary rebuilds (e.g. don’t trigger deploy on every push to a dev branch if you hit 500/mo).
  - Keep the built site under 20k files (your Vite build is well under this).
  - Don’t subscribe to a paid Cloudflare plan unless you need higher limits.

**References:** [Pages limits](https://developers.cloudflare.com/pages/platform/limits), [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/).

---

## 4. Cloudflare R2 (image storage)

- **Free tier (monthly):**
  - **10 GB** Standard storage
  - **1 million** Class A operations (PUT, LIST, etc.)
  - **10 million** Class B operations (GET, HEAD)
  - **Egress: $0** (no charge for bandwidth out)
- **Cost:** $0 until you exceed the above. After that: storage ~$0.015/GB-month, Class A ~$4.50/million, Class B ~$0.36/million.
- **How to stay free:**
  - Keep total stored images under **10 GB**.
  - Normal “upload one image / view one image” usage stays within 1M + 10M ops easily for a small app.
  - Don’t use **Infrequent Access** storage (different pricing and retrieval fees); use default Standard.

**References:** [R2 pricing](https://developers.cloudflare.com/r2/pricing).

---

## 5. MongoDB Atlas & Auth0

- **MongoDB Atlas:** M0 free cluster = 512 MB; sufficient for prendas, outfits, user profiles. Don’t scale the cluster up.
- **Auth0:** Free tier has a limited number of monthly active users (e.g. 7,000 MAU). Stay under that to avoid paid plans.

---

## Checklist: “Am I still free?”

- [ ] **HF Space:** Settings → Hardware = **CPU Basic** only (no CPU Upgrade, no GPU).
- [ ] **Render:** Only one free Web Service (backend); Instance type = **Free**; no paid add-ons.
- [ ] **Cloudflare Pages:** No paid plan required; build count &lt; 500/month if you care about builds.
- [ ] **R2:** Total bucket size &lt; 10 GB; no Infrequent Access.
- [ ] **MongoDB:** M0 cluster, not upgraded.
- [ ] **Auth0:** Within free MAU.

If all boxes are checked, you’re within the free tiers and **$0/month** for this stack.

---

## Safeguards: stay under free tier

### 1. Billing and usage alerts (recommended)

Set alerts so you get notified before hitting paid tiers:

| Service | Where to set | Suggestion |
|--------|---------------|------------|
| **Render** | [Dashboard](https://dashboard.render.com) → Account → **Billing** / notifications | Enable email for usage; free tier has no credit card, but watch “hours used” per service. |
| **Cloudflare** | [Dashboard](https://dash.cloudflare.com) → **Notifications** (bell) → **Add** | Alert when R2 storage or requests exceed a threshold (e.g. 8 GB storage). |
| **MongoDB Atlas** | Cluster → **Metrics** / **Alerts** | Alert on storage or connection count approaching M0 limits. |
| **Auth0** | [Dashboard](https://manage.auth0.com) → **Usage** | Monitor monthly active users vs free MAU. |

### 2. In-app limits (backend)

The backend enforces optional caps so usage stays within free tiers:

| Env var | Default | Effect |
|---------|---------|--------|
| `PRENDAS_MAX_PER_USER` | 200 | Max garments per user; 429 when reached. Keeps R2 and MongoDB usage bounded. |
| `RATE_LIMIT_API_PER_MIN` | 80 | Max API requests per user (or IP) per minute. |
| `RATE_LIMIT_CLASSIFY_PER_MIN` | 20 | Max classification requests per user per minute (protects HF Space). |
| `RATE_LIMIT_UPLOAD_PER_MIN` | 15 | Max uploads (and auto-adds) per user per minute (protects R2 ops). |

- **Rate limits** apply per authenticated user (or per IP if unauthenticated). Health routes (`/api/health`, `/api/ml-health`) are excluded.
- To change limits, set the env vars in `backend/.env` or in Render **Environment**. Don’t set them so high that you risk exceeding free tiers (see table above for provider limits).

### 3. R2 storage (Cloudflare API check)

- Free R2 = **10 GB** storage. The backend can **block uploads** when bucket usage would exceed a soft limit (default **9.5 GB**).
- **To enable:** Create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with **Account** → **Account Analytics** → **Read**. Set in backend env:
  - `CLOUDFLARE_API_TOKEN` = that token
  - `R2_SOFT_LIMIT_BYTES` = e.g. `9500000000` (9.5 GB; optional, default 9.5e9)
- With these set, the app calls Cloudflare’s GraphQL Analytics API before each R2 upload; if current bucket size + file size would exceed the limit, the upload returns **429** and no file is written. If `CLOUDFLARE_API_TOKEN` is not set, uploads are not blocked by storage (only by **PRENDAS_MAX_PER_USER** and rate limits).
- In **Cloudflare Dashboard** → **R2** → your bucket → **Metrics**, you can also monitor storage.
- **Cloudflare-side protections** (no payment method, optional cron check): see **[CLOUDFLARE_PROTECTIONS.md](CLOUDFLARE_PROTECTIONS.md)**.
