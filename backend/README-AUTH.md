# Auth0 and per-user wardrobe

## Auth0 Dashboard (required once)

1. **Application (SPA)**  
   In your Auth0 Application → **Settings**:
   - **Allowed Callback URLs:** `http://localhost:3000` (and your production URL, e.g. `https://tu-dominio.com`)
   - **Allowed Logout URLs:** `http://localhost:3000` (and production URL)
   - **Allowed Web Origins:** `http://localhost:3000` (and production URL)
   Save changes.

2. **API**  
   Create an API with **Identifier** = `https://fashion-api` (same as `AUTH0_AUDIENCE` in backend and frontend).

## Backend (.env)

- **AUTH0_DOMAIN** – Your Auth0 tenant (e.g. `your-tenant.us.auth0.com`).
- **AUTH0_AUDIENCE** – Must match the **Identifier** of your Auth0 API (e.g. `https://fashion-api`).
- **AUTH0_CLIENT_ID** / **AUTH0_CLIENT_SECRET** – Used by the backend if you add machine-to-machine flows; for SPA login the frontend only needs **AUTH0_DOMAIN** and **AUTH0_CLIENT_ID**.

If `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are set, `/api/prendas` and `/api/outfits` require a valid JWT (Bearer token). Otherwise the backend uses user `anonymous` and all users share the same data.

## Per-user data

- Each **Prenda** and **Outfit** is stored with a **userId** (Auth0 `sub`).
- Uploaded images are stored under **uploads/{userId}/** so each user has their own folder and the database paths match.

## Frontend: sending the token

1. Install Auth0 SPA SDK: `npm install @auth0/auth0-react`
2. Wrap the app with `Auth0Provider` (use `domain`, `clientId`, and `audience: process.env.VITE_AUTH0_AUDIENCE`).
3. In your API client (e.g. axios), get the token with `getAccessTokenSilently()` and send it:

   `Authorization: Bearer <token>`

So the frontend must log in with Auth0 and send the access token on every request to `/api/prendas` and `/api/outfits`.
