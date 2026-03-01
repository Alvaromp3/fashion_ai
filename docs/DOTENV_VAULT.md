# Dotenv Vault — store and share secrets securely

Use [dotenv-vault](https://dotenv.org/docs/dotenv-vault) to keep `backend/.env` encrypted in the cloud and share it with the team. Then sync the same secrets to Render when you deploy.

---

## How others access the secrets

**Teammates** (or you on a new machine) need the **vault key** and a one-time connect, then they can pull the same `.env`.

1. **Get the vault key** from whoever set up the vault:
   - They run `npm run env:vault-pull` (or open the vault in the dotenv app), then in `backend/.env` there is a comment block at the top with a line like:
     - `npx dotenv-vault@latest new vlt_xxxxxxxx...`
   - Or they share the key (e.g. `vlt_8b06...`) over a secure channel (1Password, Slack DM, etc.). The key only grants *read* access to pull; it doesn’t let someone push unless they have the vault account.

2. **Clone the repo** and install deps as usual. Do **not** commit `backend/.env`.

3. **One-time: connect this repo to the vault** (from repo root or from `backend/`):
   ```bash
   cd backend
   npx dotenv-vault@latest new vlt_YOUR_VAULT_KEY_HERE
   ```
   Replace `vlt_YOUR_VAULT_KEY_HERE` with the key from step 1.

4. **Pull the secrets** into `backend/.env`:
   ```bash
   npm run env:vault-pull
   ```
   (from repo root)

After that, they have a local `backend/.env` and can run the app or `npm run env:sync-render` like you.

**Who can push?** Only someone logged into the [dotenv-vault](https://dotenv.org) account that owns the vault (or with the right credentials). So you control who can update the shared secrets; everyone else uses the key to pull.

---

## 1. One-time: connect backend to your vault (vault owner)

From **repo root** (scripts run from here) or from **backend/**:

```bash
cd backend
npx dotenv-vault@latest new
```

If you already have a vault key (from an existing vault’s `.env` header), link this project to it:

```bash
cd backend
npx dotenv-vault@latest new vlt_YOUR_VAULT_KEY_HERE
```

Replace `vlt_YOUR_VAULT_KEY_HERE` with the key from the vault (e.g. from the “Connect to it locally” line in the vault’s `.env` instructions).

---

## 2. Push secrets up (store / share)

Upload `backend/.env` to the vault so it’s stored securely and others can pull it:

```bash
# From repo root
npm run env:vault-push
```

Or from `backend/`:

```bash
cd backend
npx dotenv-vault@latest push
```

Teammates can then run **Pull** (below) to get the same `.env` without you sending the file.

---

## 3. Pull secrets down

Download the latest `.env` from the vault into `backend/.env`:

```bash
# From repo root
npm run env:vault-pull
```

Or from `backend/`:

```bash
cd backend
npx dotenv-vault@latest pull
```

Use this when someone else has pushed changes or when you’re on a new machine.

---

## 4. Sync vault → Render

To update Render’s environment from the vault in one step:

1. Pull the latest `.env` from the vault.
2. Push those variables to the Render backend service via the API.

From repo root:

```bash
npm run env:sync-render
```

This runs `env:vault-pull` then `render:env`. Ensure `RENDER_API_KEY` and optionally `RENDER_SERVICE_ID` are in `backend/.env` (or in the vault so they come down on pull). Then deploy so Render uses the new vars: `npm run render:deploy`.

---

## Quick reference

| Goal                     | Command (repo root)     |
|--------------------------|-------------------------|
| Push `.env` to vault     | `npm run env:vault-push` |
| Pull `.env` from vault   | `npm run env:vault-pull` |
| Vault → Render + deploy  | `npm run env:sync-render` then `npm run render:deploy` |

- Keep `backend/.env` out of git (it should be in `.gitignore`).
- You can commit `.env.vault` if you use dotenv-vault’s build flow for deployment.
- [Dotenv Vault docs](https://dotenv.org/docs/dotenv-vault)
