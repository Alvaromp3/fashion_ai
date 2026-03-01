# Cloudflare-side protections so you never get charged

Cloudflare does **not** offer a built-in “block at 10 GB” or account spending cap for R2 on the free plan. These steps use **account settings** and **our app** so you stay within the free tier and avoid charges.

---

## 1. Do not add a payment method (strongest protection)

- On the **free plan**, you can use **R2** (10 GB, 1M Class A, 10M Class B) and **Pages** without adding a card.
- If you **never add a payment method**, Cloudflare cannot charge you. Usage beyond the free tier may be throttled or limited instead of billed.
- **Steps:** [Cloudflare Dashboard](https://dash.cloudflare.com) → **Profile** → **Billing**. Do **not** add a credit card or payment method. Use only products that are free without a card (R2, Pages, Workers free tier).

---

## 2. Enforce R2 storage in the app (required for uploads)

- R2 has **no native “quota” or “block at 10 GB”** in the dashboard. The only way to **block** uploads before you exceed 10 GB is in the **application**.
- Our backend already does this when you set:
  - **`CLOUDFLARE_API_TOKEN`** (Account → Account Analytics → Read)
  - **`R2_SOFT_LIMIT_BYTES`** (e.g. `9500000000` for 9.5 GB; optional, default 9.5e9)
- With those set, every R2 upload is checked against Cloudflare’s Analytics API; if the bucket would exceed the limit, the upload is **rejected (429)** and nothing is written. See [COST_AND_LIMITS.md](COST_AND_LIMITS.md#3-r2-storage-cloudflare-api-check) and [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md#5-r2-storage-safeguard-optional).

---

## 3. Optional: Check R2 usage from the command line or cron

- You can run a **usage check script** (e.g. daily via cron or in CI). If usage is over your soft limit, the script exits with code **1** so you can alert (email, Slack, etc.).
- From the **backend** directory (so `backend/.env` is loaded):

  ```bash
  cd backend
  npm run check:r2
  ```
  Or: `node scripts/cloudflare-check-r2-usage.js`

- If you run it from **cron**, ensure the cron job has access to `backend/.env` (or the same env vars). Example (run daily at 9:00):

  ```bash
  0 9 * * * cd /path/to/fashion_ai/backend && node scripts/cloudflare-check-r2-usage.js || echo "R2 usage over limit"
  ```

- This does **not** block uploads by itself; it only **reports** and fails the script so you can react (e.g. delete objects or fix the app). Upload blocking is done in the app (step 2).

---

## 4. What Cloudflare does *not* offer (free plan)

- **No R2 storage quota** in the dashboard (no “block at 10 GB”).
- **No account-wide spending cap** for R2/Workers/Pages on the free plan.
- **Usage-based billing notifications** (e.g. “notify when R2 exceeds X GB”) are for **Professional plans or higher**, not free.

So on the free plan, “Cloudflare-side” protection = **no payment method** + **our app enforcing the R2 soft limit** + optional **cron/CI usage check**.

---

## 5. Quick checklist

- [ ] **Billing:** No payment method added (Dashboard → Profile → Billing).
- [ ] **Backend env:** `CLOUDFLARE_API_TOKEN` and (optional) `R2_SOFT_LIMIT_BYTES` set so uploads are blocked when bucket would exceed the limit.
- [ ] **Optional:** Cron or CI runs `backend/scripts/cloudflare-check-r2-usage.js` and alerts you if it exits with code 1.
