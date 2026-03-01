# Auth0 login – checklist si no deja hacer login

## "Service not found: https://fashion-api"

Ese error significa que **falta crear la API** en Auth0. El frontend pide un token para el audience `https://fashion-api`, pero esa API no existe en tu tenant.

### Crear la API en Auth0 (solo una vez)

1. Abre https://manage.auth0.com e inicia sesión.
2. En el menú izquierdo haz clic en **APIs** (no dentro de Applications).
3. Pulsa **+ Create API**.
3. **Name:** por ejemplo `Fashion API`.
4. **Identifier:** tiene que ser exactamente `https://fashion-api` (es el “audience” que usa el backend y el frontend).
5. **Signing Algorithm:** RS256.
6. Pulsa **Create**.

Vuelve a probar **Log in** en la app.

---

## 1. En Auth0 Dashboard → Applications → tu aplicación (SPA)

- **Application Type:** debe ser **Single Page Application** (no "Regular Web" ni "Native").
- **Settings** → bajar a **Application URIs**:
  - **Allowed Callback URLs:**  
    `http://localhost:3000`  
    (solo esa URL, sin barra final; en producción añade también tu URL tipo `https://tudominio.com`).
  - **Allowed Logout URLs:**  
    `http://localhost:3000`  
    (y en producción tu URL).
  - **Allowed Web Origins:**  
    `http://localhost:3000`  
    (y en producción tu URL).
- Guardar con **Save Changes**.

## 2. API en Auth0 (obligatorio para que funcione el login)

- **APIs** → **Create API** si no existe.
- **Identifier** = `https://fashion-api` (debe coincidir con `VITE_AUTH0_AUDIENCE` en `frontend/.env`).
- Sin esta API verás el error: *"Service not found: https://fashion-api"*.

## 3. Frontend

- Reiniciar el frontend después de tocar `.env`:  
  `cd frontend && npm run dev`
- En la pantalla de login, si aparece un mensaje de error en rojo, es el que devuelve Auth0 o el SDK; úsalo para afinar (callback URL, audience, etc.).

## 4. Comportamiento típico cuando ya está bien

- Clic en **Log in** → te lleva a la página de Auth0 (login con email o redes).
- Tras iniciar sesión → vuelves a `http://localhost:3000` y entras en la app (ya no ves la pantalla de login).

Si vuelves a `http://localhost:3000` y sigues viendo la pantalla de login, lo más habitual es:

- Falta o está mal **Allowed Callback URLs** = `http://localhost:3000`, o  
- La aplicación no es tipo **Single Page Application**, o  
- Falta **cacheLocation="localstorage"** en el provider (en este proyecto ya está puesto).

---

## Content Security Policy / 'eval' blocked

El mensaje *"Content Security Policy of your site blocks the use of 'eval'"* suele venir de la **página de login de Auth0** (auth0.com) o de una **extensión del navegador**, no de la app Fashion AI. Si el login funciona después de crear la API, puedes ignorarlo. Si tu sitio define una CSP muy estricta, en desarrollo podrías permitir `'unsafe-eval'` (no recomendado en producción).
