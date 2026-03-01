# Guía paso a paso: configurar producción (fashion-ai.pages.dev)

Sigue estos pasos en orden para que la app en **https://fashion-ai.pages.dev** funcione con login y API.

**Para correr todo en local** (backend + frontend + ML), usa **[docs/CORRER_EN_LOCAL.md](CORRER_EN_LOCAL.md)**.

---

## Si el backend (Render) lo tiene otra persona

Tú no puedes entrar en Render, pero **sí** puedes hacer la **Parte 2 (Cloudflare Pages)** y la **Parte 3 (Auth0)** si tienes acceso. Para el backend tienes dos opciones:

### Opción 1: Pedir a la persona que tiene Render que haga esto

Envía a esa persona este texto (cópialo y pégalo por email o chat):

---

**Asunto: Variable CORS en el backend de Fashion AI (Render)**

Hola,

Para que la app en producción (https://fashion-ai.pages.dev) pueda llamar al backend sin errores de CORS, hace falta añadir una variable de entorno en Render y volver a desplegar:

1. Entra en **https://dashboard.render.com** y abre el servicio del **backend** de Fashion AI (por ejemplo "fashion-ai-backend").
2. En el menú izquierdo, ve a **Environment**.
3. Añade o edita la variable:
   - **Key:** `CORS_ORIGINS`
   - **Value:** `http://localhost:3000,https://fashion-ai.pages.dev`
4. Guarda los cambios (Save Changes).
5. Arriba, en **Manual Deploy**, pulsa **Deploy latest commit** (o "Clear build cache & deploy") y espera a que termine el deploy.

Sin este cambio, el frontend en fashion-ai.pages.dev recibirá errores de CORS al llamar al API.

Gracias.

---

Cuando te confirmen que está hecho, sigue tú con la **Parte 2** y la **Parte 3** más abajo.

### Opción 2: Que te den acceso a Render o la API key

- Si te dan **acceso al Dashboard de Render** (como colaborador), puedes hacer la **Parte 1** tú mismo (más abajo).
- Si te pasan una **RENDER_API_KEY** (Render → Account → API Keys) y, si hace falta, el **RENDER_SERVICE_ID** del backend, en tu máquina:
  1. En `backend/.env` añade `RENDER_API_KEY=...` (y `RENDER_SERVICE_ID=srv-xxxx` si te lo dan).
  2. Asegúrate de que en `backend/.env` está `CORS_ORIGINS=http://localhost:3000,https://fashion-ai.pages.dev`.
  3. En la raíz del repo: `npm run render:env` y luego `npm run render:deploy`.

---

## Parte 1: Backend (Render) — CORS y re-despliegue

*(Solo si tú tienes acceso a Render.)*

### Opción A: Desde el Dashboard de Render (manual)

1. Abre **[dashboard.render.com](https://dashboard.render.com)** e inicia sesión.
2. En la lista de servicios, entra en **fashion-ai-backend** (o el nombre de tu backend).
3. En el menú izquierdo, haz clic en **Environment**.
4. Busca la variable **`CORS_ORIGINS`**:
   - Si **existe**: edítala y pon exactamente:
     ```text
     http://localhost:3000,https://fashion-ai.pages.dev
     ```
   - Si **no existe**: pulsa **Add Environment Variable**, Key = `CORS_ORIGINS`, Value = `http://localhost:3000,https://fashion-ai.pages.dev`.
5. Guarda los cambios (Save Changes).
6. Ve a **Manual Deploy** (arriba) → **Deploy latest commit** (o **Clear build cache & deploy** si quieres forzar rebuild). Espera a que termine el deploy.

### Opción B: Desde tu máquina (sync .env y deploy)

1. En tu proyecto, el archivo **`backend/.env`** ya debe tener:
   ```env
   CORS_ORIGINS=http://localhost:3000,https://fashion-ai.pages.dev
   ```
2. En la raíz del repo (`fashion_ai`), en la terminal:
   ```bash
   npm run render:env
   ```
   (Necesitas `RENDER_API_KEY` en `backend/.env`; se crea en Render → Account → API Keys.)
3. Luego:
   ```bash
   npm run render:deploy
   ```
4. Espera a que el deploy termine.

---

## Parte 2: Frontend (Cloudflare Pages) — variables VITE_* y re-despliegue

### Opción A: Desde el Dashboard de Cloudflare (manual)

1. Abre **[dash.cloudflare.com](https://dash.cloudflare.com)** e inicia sesión.
2. Ve a **Workers & Pages** → entra en el proyecto **fashion-ai** (el que da la URL `fashion-ai.pages.dev`).
3. Pestaña **Settings** → sección **Environment variables**.
4. Elige el entorno **Production** (o ambos Production y Preview si quieres).
5. Comprueba o añade estas variables (sin espacios extra, sin `/` al final en las URLs):

   | Nombre | Valor |
   |--------|--------|
   | `VITE_API_BASE_URL` | `https://fashion-ai-backend-c6wd.onrender.com` |
   | `VITE_AUTH0_CALLBACK_URL` | `https://fashion-ai.pages.dev` |
   | `VITE_AUTH0_DOMAIN` | `dev-3ddv5sckb2bow6w7.us.auth0.com` |
   | `VITE_AUTH0_CLIENT_ID` | `ExmqTGsXz5xaxn45QokCc1fnfwlY50dk` |
   | `VITE_AUTH0_AUDIENCE` | `https://fashion-classifier-api` |

   (Los valores de Auth0 deben coincidir con los de tu aplicación en Auth0 y con el backend.)

6. Guarda (Save).
7. Ve a la pestaña **Deployments**, abre el menú (tres puntos) del último deployment y elige **Retry deployment** (o haz un nuevo push a Git si tienes Pages conectado al repo para que se redepliegue solo).

### Opción B: Desde tu máquina (Wrangler + deploy)

1. En **`frontend/.env`** (o `frontend/.env.production`) añade o deja para producción:
   ```env
   VITE_API_BASE_URL=https://fashion-ai-backend-c6wd.onrender.com
   VITE_AUTH0_CALLBACK_URL=https://fashion-ai.pages.dev
   VITE_AUTH0_DOMAIN=dev-3ddv5sckb2bow6w7.us.auth0.com
   VITE_AUTH0_CLIENT_ID=ExmqTGsXz5xaxn45QokCc1fnfwlY50dk
   VITE_AUTH0_AUDIENCE=https://fashion-classifier-api
   ```
2. En la raíz del repo:
   ```bash
   npm run cloudflare:pages-env
   ```
   (Así se suben las `VITE_*` a Pages.)
3. Luego:
   ```bash
   npm run cloudflare:pages-deploy
   ```
   (Build del frontend y deploy a Pages.)

---

## Parte 3: Auth0 — las tres URLs

1. Abre **[auth0.com](https://auth0.com)** → **Dashboard** e inicia sesión.
2. Menú izquierdo: **Applications** → **Applications**.
3. Haz clic en la aplicación que usa el frontend (la de tipo **Single Page Application** con el Client ID que usas en `VITE_AUTH0_CLIENT_ID`).
4. Baja hasta **Application URIs** (o **Settings** y busca estas cajas).
5. Rellena exactamente (sin `/` al final):

   - **Allowed Callback URLs**  
     Añade o incluye: `https://fashion-ai.pages.dev`  
     Si ya hay `http://localhost:3000`, déjalo también. Ejemplo:  
     `http://localhost:3000, https://fashion-ai.pages.dev`

   - **Allowed Logout URLs**  
     Añade o incluye: `https://fashion-ai.pages.dev`  
     Ejemplo: `http://localhost:3000, https://fashion-ai.pages.dev`

   - **Allowed Web Origins**  
     Añade o incluye: `https://fashion-ai.pages.dev`  
     Ejemplo: `http://localhost:3000, https://fashion-ai.pages.dev`

6. Baja y haz clic en **Save Changes**.

---

## Comprobar que todo va bien

1. Abre **https://fashion-ai.pages.dev** en una ventana de incógnito.
2. Prueba a hacer login: debería redirigir a Auth0 y volver a `fashion-ai.pages.dev` sin error.
3. Si antes veías “ML not available” o errores de red: tras los re-deploys (backend + frontend) y el guardado en Auth0, debería dejar de aparecer si el backend y ML están bien configurados.

Si algo falla, revisa:
- **Backend:** Render → fashion-ai-backend → **Logs** (que no haya errores de CORS o de env).
- **Frontend:** Cloudflare Pages → **Deployments** → último deploy en “Success”.
- **Auth0:** que las tres URLs contengan exactamente `https://fashion-ai.pages.dev` (sin barra final).

---

## Resumen si no tienes acceso a Render

| Quién | Qué hacer |
|-------|-----------|
| **Tú** | 1. Enviar el mensaje de la sección "Si el backend lo tiene otra persona" a quien tenga Render. |
| **Tú** | 2. Hacer la **Parte 2** (Cloudflare Pages) si tienes acceso al proyecto en Cloudflare. |
| **Tú** | 3. Hacer la **Parte 3** (Auth0) si tienes acceso al tenant de Auth0 de la app. |
| **La otra persona** | Añadir `CORS_ORIGINS` en Render y hacer **Deploy latest commit**. |
