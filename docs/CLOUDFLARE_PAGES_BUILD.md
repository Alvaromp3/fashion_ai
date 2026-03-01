# Configuración de build en Cloudflare Pages (fashion-ai)

Configuración recomendada para **Workers & Pages** cuando el proyecto está conectado por Git.

## En el dashboard: Settings → Builds & deployments

| Campo | Valor |
|--------|--------|
| **Build command** | `npm run build` |
| **Build output directory** | `frontend/dist` |
| **Root directory** | *(vacío o `/`)* |

Con **Root directory** en blanco o `/`, el comando se ejecuta desde la raíz del repo; el script `npm run build` en la raíz ya hace `cd frontend && npm run build` y genera `frontend/dist`.

### Alternativa (raíz = frontend)

Si prefieres que Cloudflare entre en la carpeta del frontend:

| Campo | Valor |
|--------|--------|
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

---

## Comandos de deploy (opcionales)

- **Deploy command**: en **Pages** conectado a Git normalmente no se usa; Cloudflare hace build + deploy automático. Si usas **Direct Upload** desde tu máquina: `npx wrangler pages deploy frontend/dist --project-name fashion-ai` (o `npm run cloudflare:pages-deploy`).
- **Version command** (`npx wrangler versions upload`): es para **Workers** con versionado; para **Pages** no hace falta.

---

## Variables y secretos

Configura en **Settings → Environment variables** (Production y/o Preview) las variables `VITE_*` que necesite el frontend. Ver [PASO_A_PASO_PRODUCCION.md](PASO_A_PASO_PRODUCCION.md) (Parte 2) para la lista.

---

## Resumen rápido

- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `frontend/dist`
- **Root directory**: vacío o `/`
- **Variables**: añadir las `VITE_*` en Environment variables
