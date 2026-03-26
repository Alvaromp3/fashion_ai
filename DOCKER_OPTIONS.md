# ML en Docker (ViT: best_model_17_marzo.keras)

## Arrancar todo (ML en Docker + backend y frontend en local)

```bash
./start-all-docker.sh
```

Abre http://localhost:3000. Para parar: Ctrl+C y luego `./stop-all.sh` si hace falta.

---

## Solo ML en Docker (backend/frontend los arrancas tú)

```bash
docker build -t fashion-ml ./ml-service
docker compose -f docker-compose.ml.yml up -d
```

Monta **`ml-service/models/best_model_17_marzo.keras`** en el contenedor si no está en la imagen (ver `docker-compose.ml.yml`).

Luego arranca backend (4000) y frontend (3000) en local.

- **Ver logs del ML:** `docker logs fashion-ml`
- **Parar ML:** `docker compose -f docker-compose.ml.yml down` o `./stop-all.sh`

**Requisitos:** Docker instalado.
