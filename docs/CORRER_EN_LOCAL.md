# Cómo correr todo en local

Varias formas de levantar **backend + frontend + ML** en tu máquina. El backend usa **`backend/.env`** (no `.env.example`).

---

## Opción 1: Un solo comando (recomendado)

Desde la **raíz del repo** (`fashion_ai`):

```bash
./start-all.sh
```

o, que es lo mismo:

```bash
./run.sh
```

- Arranca backend (4000), frontend (3000) y ML (6001).
- Espera ~25 s y hace health checks.
- Para parar: **Ctrl+C** en esa terminal o, en otra terminal, `./stop-all.sh`.

**Requisitos:** Node.js en el PATH, `backend/.env` configurado, y en `ml-service` un venv con dependencias (`cd ml-service && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`).

---

## Opción 2: npm run start (tres procesos en una terminal)

Desde la **raíz del repo**:

```bash
npm run start
```

Usa `concurrently` para lanzar en paralelo:

- Backend: `npm run start:backend` (nodemon en `backend/`)
- ML: `npm run start:ml` (script `ml-service/start.sh`)
- Frontend: `npm run start:frontend` (Vite en `frontend/`)

Para parar: **Ctrl+C** en esa terminal. Para matar todo desde otra terminal:

```bash
npm run stop
```

**Requisitos:** `concurrently` instalado (`npm install` en la raíz), venv de ML creado y dependencias instaladas.

---

## Opción 3: Tres terminales (manual)

Útil si quieres ver los logs de cada servicio por separado.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — ML**

```bash
cd ml-service
./start.sh
```

(Si `./start.sh` dice "Permission denied": `chmod +x ml-service/start.sh`. Si no existe `venv`, antes: `python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`.)

**Terminal 3 — Frontend**

```bash
cd frontend
npm run dev
```

Luego abre **http://localhost:3000**. Para parar, Ctrl+C en cada terminal o en una cuarta: `./stop-all.sh`.

---

## Opción 4: Solo backend

Si solo quieres el API (por ejemplo para probar con Postman):

```bash
./start-backend-only.sh
```

o:

```bash
cd backend && npm run dev
```

Backend en **http://localhost:4000**. Para parar: Ctrl+C o `./stop-all.sh`.

---

## Resumen rápido

| Objetivo              | Comando                          | Parar              |
|-----------------------|----------------------------------|--------------------|
| Todo (recomendado)    | `./start-all.sh` o `./run.sh`   | Ctrl+C o `./stop-all.sh` |
| Todo (npm)            | `npm run start`                  | Ctrl+C o `npm run stop`  |
| Manual (3 terminales) | Ver Opción 3 arriba              | Ctrl+C en cada una o `./stop-all.sh` |
| Solo backend          | `./start-backend-only.sh`        | Ctrl+C o `./stop-all.sh` |

---

## Puertos

| Servicio | Puerto | URL local              |
|----------|--------|------------------------|
| Frontend | 3000   | http://localhost:3000  |
| Backend  | 4000   | http://localhost:4000  |
| ML       | 6001   | http://localhost:6001  |

---

## Si algo falla

- **Backend no arranca:** Revisa `backend/.env` (MONGODB_URI, etc.). Logs: `tail -f logs/backend.log`.
- **ML "No module named 'flask'":** Crea el venv en `ml-service`: `cd ml-service && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`. Luego usa `./start.sh` o `./start-all.sh`.
- **Frontend no arranca:** `cd frontend && npm install && npm run dev`. Logs: `tail -f logs/frontend.log`.
- **Puertos ocupados:** `./stop-all.sh` y vuelve a lanzar.

Los scripts `start-all.sh`, `stop-all.sh` y `run.sh` están en la **raíz del repo**, no dentro de `backend/` ni `ml-service/`.
