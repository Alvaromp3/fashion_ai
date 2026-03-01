# Env Vault — Push & Pull (team reference)

We use **Env Vault** so we don’t have to email passwords. All keys live in the vault; everyone pulls the same set.

**From the repo root:**

| What you want | Command |
|---------------|--------|
| **Pull production** (deploy / prod-like local) | `npm run env:vault-pull` |
| **Pull development** (local dev) | `npm run env:vault-pull:dev` |
| **Push** your keys (save backend/.env to vault) | `npm run env:vault-push` |

So it’s **not** `npm pull env` — it’s:

```bash
npm run env:vault-pull       # production keys → backend/.env
npm run env:vault-pull:dev   # development keys → backend/.env
npm run env:vault-push       # save your changes to the vault
```

**One-time setup (new clone / new machine):**

```bash
npm install
cd backend && npx dotenv-vault@latest new vlt_63ba3b1fd203fc0e487d8f4a4dc7acea0e707eacb55aa40e5076c8a77b2ca1b4
```

The first time you pull, the CLI may open the browser to log in and create `.env.me`. After that, pull works without login. For non-interactive use see [docs/DOTENV_VAULT.md](DOTENV_VAULT.md) (DOTENV_ME).

**Para que todo lo del vault esté en tu proyecto:** entra en [vault.dotenv.org](https://vault.dotenv.org/), inicia sesión y revisa el proyecto **fashion_ai** (development). Luego en tu repo ejecuta `npm run env:vault-pull:dev` (desde la raíz); eso actualiza `backend/.env`. Las variables de frontend (VITE_*) si están en el vault hay que copiarlas a `frontend/.env` a mano o asegurarse de que el vault tenga una convención para separar backend vs frontend.

- **Pull** updates `backend/.env` from the vault. Do this when someone else pushed new keys or you’re on a new machine.
- **Push** uploads your current `backend/.env` to the vault. Only whoever owns the vault (or has write access) can push.

Full details: [docs/DOTENV_VAULT.md](DOTENV_VAULT.md).
