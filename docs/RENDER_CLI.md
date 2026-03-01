# Render CLI

Use the [Render CLI](https://render.com/docs/cli) to validate the blueprint and trigger deploys from the terminal. **Creating** the backend service (first time) is still done in the [Dashboard](https://dashboard.render.com) (New → Blueprint → connect repo, set path to `render-backend-only.yaml`). After that, use the CLI to deploy and view logs.

---

## 1. Install

**Windows (PowerShell):**

```powershell
# Download and extract (use your architecture: amd64, arm64, etc.)
$ver = "2.10"
Invoke-WebRequest -Uri "https://github.com/render-oss/cli/releases/download/v$ver/cli_${ver}_windows_amd64.zip" -OutFile render.zip -UseBasicParsing
Expand-Archive render.zip -DestinationPath .
# Add the folder to PATH or move render.exe to a folder in PATH
```

Or download from [Releases](https://github.com/render-oss/cli/releases) and unzip.

**macOS / Linux:**

```bash
# Homebrew
brew install render

# Or install script
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
```

---

## 2. Log in

```bash
render login
```

Your browser opens; authorize the CLI. The token is saved locally.

**Non-interactive (CI):** Set `RENDER_API_KEY`. Create one at [Dashboard → Account → API Keys](https://dashboard.render.com/u/settings#api-keys).

---

## 3. Validate the blueprint

From the **repo root**:

```bash
render blueprints validate render-backend-only.yaml
```

Or:

```bash
npm run render:validate
```

Exits with 0 if the file is valid.

---

## 4. One-time: Create the backend service (Dashboard)

The CLI cannot create **free-tier** services. Do this once in the Dashboard:

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo and set **Blueprint path** to **`render-backend-only.yaml`**.
3. After the service is created, open **fashion-ai-backend** → **Environment** and add your env vars (see [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) or [HOST_THE_REST.md](HOST_THE_REST.md)).
4. Note the **service ID** (from the service URL or from `render services -o json`).

---

## 4b. Set environment variables from the terminal (API)

The Render CLI does not have a command to set env vars. Use the **Render API** via the sync script:

1. Create an **API key** at [Dashboard → Account → API Keys](https://dashboard.render.com/u/settings#api-keys) (not the CLI token).
2. From repo root:

```bash
# Option A: Set both (PowerShell)
$env:RENDER_API_KEY = "rnd_xxxx"
$env:RENDER_SERVICE_ID = "srv-xxxx"   # optional if you use Render CLI
npm run render:env

# Option B: If Render CLI is installed and you're logged in, service ID is resolved by name
$env:RENDER_API_KEY = "rnd_xxxx"
npm run render:env
```

The script reads `backend/.env` and syncs those variables to the Render backend service (replacing existing user env vars). Then trigger a deploy so the new vars take effect: `npm run render:deploy`.

**Using [dotenv-vault](https://dotenv.org/docs/dotenv-vault)?** Store secrets in the vault, then sync to Render: `npm run env:sync-render`. See [DOTENV_VAULT.md](DOTENV_VAULT.md).

---

## 5. Deploy via CLI

After the service exists, trigger a deploy:

```bash
# If you set the service ID (optional)
set RENDER_SERVICE_ID=srv-xxxx   # Windows
export RENDER_SERVICE_ID=srv-xxxx   # macOS/Linux

npm run render:deploy
```

Or run the CLI directly:

```bash
# Interactive: CLI will let you pick the service
render deploys create --wait

# Non-interactive: pass service ID
render deploys create srv-xxxxxxxxxxxx --wait --output json --confirm
```

`--wait` blocks until the deploy finishes (exits non-zero if the deploy fails).

---

## 6. Other useful commands

| Command | Description |
|---------|-------------|
| `render services` | List services; select one to deploy, view logs, or SSH. |
| `render services -o json` | List services as JSON (e.g. to get service ID). |
| `render deploys list [SERVICE_ID]` | List deploys for a service. |
| `render ssh [SERVICE_ID]` | Open SSH shell to a running instance. |

---

## Quick reference

- **Validate:** `npm run render:validate` or `render blueprints validate render-backend-only.yaml`
- **Env (sync backend/.env to Render):** `npm run render:env` (requires `RENDER_API_KEY`; optional `RENDER_SERVICE_ID` if CLI installed)
- **Deploy:** `npm run render:deploy` (uses `RENDER_SERVICE_ID` if set) or `render deploys create <SERVICE_ID> --wait`
- **Docs:** [Render CLI](https://render.com/docs/cli), [Non-interactive mode](https://render.com/docs/cli#non-interactive-mode)
