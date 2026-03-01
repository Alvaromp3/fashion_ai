# Configuración de build en Cloudflare Pages (fashion-ai)

Configuración recomendada para **Cloudflare Pages** cuando el proyecto está conectado por Git.

## Build configuration (Settings → Builds & deployments)

| Campo | Valor | Notas |
|--------|--------|--------|
| **Build command** | `npm run build` | Opcional en la UI; necesario para que se genere el sitio. |
| **Build output directory** | `frontend/dist` | **Importante:** sin esto, Pages no encuentra el build. |
| **Root directory** (Path) | vacío o `/` | Raíz del repo; desde ahí `npm run build` corre el build del frontend. |
| **Deploy command** | *(dejar vacío)* | En Pages + Git, Cloudflare despliega el output del build automáticamente. No uses `npx wrangler deploy` (es para Workers). |
| **Non-production branch deploy command** | *(opcional, dejar vacío)* | `npx wrangler versions upload` es para **Workers**; en Pages no hace falta. |

Con **Root directory** en blanco o `/`, el comando se ejecuta desde la raíz del repo; el script `npm run build` en la raíz ya hace `cd frontend && npm run build` y genera `frontend/dist`.

### Si prefieres raíz = frontend

| Campo | Valor |
|--------|--------|
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

---

## Comandos de deploy (opcionales)

- **Deploy command**: en **Pages** conectado a Git no hace falta; Cloudflare hace build + deploy del directorio de salida. Si usas **Direct Upload** desde tu máquina: `npx wrangler pages deploy frontend/dist --project-name fashion-ai` (o `npm run cloudflare:pages-deploy`).
- **Non-production / Version command** (`npx wrangler versions upload`): es para **Workers** con versionado; para **Pages** puedes dejarlo vacío.

---

## Variables y secretos

Configura en **Settings → Environment variables** (Production y/o Preview) las variables `VITE_*` que necesite el frontend. Ver [PASO_A_PASO_PRODUCCION.md](PASO_A_PASO_PRODUCCION.md) (Parte 2) para la lista.

---

## Resumen rápido (configuración fija)

| Campo | Valor | ⚠️ Evitar |
|--------|--------|--------|
| **Build command** | `npm run build` | — |
| **Build output directory** (Path) | `frontend/dist` | No uses `\frontend\dist` (barras invertidas dan error). |
| **Root directory** | *(vacío)* o `/` | No pongas `\frontend` aquí si el build se lanza desde la raíz. |
| **Deploy command** | *(dejar vacío)* | No uses `npx wrangler deploy` (es para Workers; en Pages con Git sobra). |
| **Non-production deploy command** | *(vacío)* | No uses `npx wrangler versions upload` (es para Workers). |
| **Production branch** | `main` | — |
| **Variables** | Añadir las `VITE_*` en Environment variables | — |
