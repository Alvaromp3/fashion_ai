# Auth0 for production (fashion-ai.pages.dev)

The app uses **Auth0** for login. For **https://fashion-ai.pages.dev** to work you need to: (1) set the production callback URL in the **frontend** env so redirects never go to localhost, and (2) allow that URL in the **Auth0** Dashboard.

---

## 1. Frontend: set production callback URL (so redirects don’t use localhost)

In **Cloudflare Pages** → your project → **Settings** → **Environment variables** (Production), set:

| Name | Value |
|------|--------|
| `VITE_AUTH0_CALLBACK_URL` | `https://fashion-ai.pages.dev` |

(No trailing slash. Use your actual Pages URL if different.)

When this is set, the app uses it for Auth0 **redirect_uri** and **returnTo** in production instead of `window.location.origin`, so redirects never go to localhost. Then **redeploy** the frontend so the build picks up the variable.

---

## 2. Auth0 Dashboard: allow the production URL (do this once)

1. Go to **[Auth0 Dashboard](https://manage.auth0.com)** → **Applications** → open your **Single Page Application** (the one whose Client ID you use in the frontend).

2. In **Settings**, find these three fields and add your **production URL** (same as `VITE_AUTH0_CALLBACK_URL`, no trailing slash):

   | Field | Add this (one per line if you keep localhost) |
   |-------|-----------------------------------------------|
   | **Allowed Callback URLs** | `https://fashion-ai.pages.dev` |
   | **Allowed Logout URLs** | `https://fashion-ai.pages.dev` |
   | **Allowed Web Origins** | `https://fashion-ai.pages.dev` |

   You can keep `http://localhost:3000` (or similar) on its own line for local dev. Example:

   ```
   http://localhost:3000
   https://fashion-ai.pages.dev
   ```

3. Click **Save Changes**.

---

## Why

- **Callback URL:** After login, Auth0 redirects the user back to your app. That URL must be in Allowed Callback URLs or Auth0 will reject it.
- **Logout URL:** After logout, Auth0 sends the user here. Must be in Allowed Logout URLs.
- **Web Origins:** The frontend runs on this origin; Auth0 uses it for CORS and silent token refresh. Must be in Allowed Web Origins.

The app uses `window.location.origin`, so on production it will send `https://fashion-ai.pages.dev` — that exact value must be allowed in Auth0.

---

## If you use a custom domain

If your frontend is at e.g. **https://fashion.yourdomain.com**, add that URL (no trailing slash) in the same three fields instead of (or in addition to) `https://fashion-ai.pages.dev`.
