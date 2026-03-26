# Hugging Face Space — setup steps

This folder deploys as a **Hugging Face Space** with **Docker**. The classifier loads **`best_model_17_marzo.keras`** only.

## Quick (script, after login)

1. **GitHub:** create release `models-v1.0` with asset **`best_model_17_marzo.keras`** (or **`vit_model_v1.zip`** containing a `.keras` file). If the zip is tiny (~134 bytes), re-upload the real weights.
2. **Hugging Face:** log in, then run from the repo root:
   ```powershell
   huggingface-cli login
   .\hf-space\scripts\setup-space.ps1
   ```
   Or on macOS/Linux: `./hf-space/scripts/setup-space.sh`  
   Set backend **`ML_SERVICE_URL`** to the Space URL when the build finishes.

---

## 1. Create a GitHub Release with the model

1. Open your **fashion_ai** repo on GitHub.
2. **Releases** → **Create a new release** → tag e.g. **`models-v1.0`**.
3. Upload **`best_model_17_marzo.keras`** (or use `./scripts/publish-models-release.sh` from repo root).

---

## 2. Create the Space on Hugging Face

1. [huggingface.co/spaces](https://huggingface.co/spaces) → **Create new Space**.
2. **SDK:** **Docker**.
3. **License:** e.g. MIT → **Create Space**.

---

## 3. Add files to the Space

**Recommended:** connect the GitHub repo and set the Dockerfile path to **`hf-space/Dockerfile`** with **build context = repository root** (see `docs/DEPLOY_CLOUDFLARE.md`).

If you copy files manually, include at least what **`hf-space/Dockerfile`** expects: `ml-service/` sources, `space_app.py`, and the download logic for **`best_model_17_marzo.keras`**.

---

## 4. GitHub Release and build args

Default in **`hf-space/Dockerfile`**: `ARG GITHUB_REPO=Alvaromp3/fashion_ai`, `ARG MODELS_RELEASE_TAG=models-v1.0`.

- **HF_VIT_URL:** optional build arg to download the `.keras` from a public URL (e.g. Hugging Face `resolve/main/...`).
- **Private repo:** set **GITHUB_TOKEN** if your CI/Space supports it.

**Runtime:** Space **Settings → Variables** — **`CORS_ORIGINS`** = your frontend origin or `*` for tests.

---

## 5. Build and run

First build may take 10–15 minutes (TensorFlow). API base: `https://YOUR_USERNAME-SPACE_NAME.hf.space`.

---

## 6. Backend env

```env
ML_SERVICE_URL=https://YOUR_USERNAME-SPACE_NAME.hf.space
```

The backend calls **`/classify-vit`** for classification. **`POST /classify`** on the ML service uses the same ViT weights.

Optional **`ML_VIT_SERVICE_URL`**: second Space URL; if unset, **`ML_SERVICE_URL`** is used for ViT routes.

---

## Troubleshooting

- **“ViT model required” / download failed**  
  Ensure the release contains **`best_model_17_marzo.keras`** or a valid **`vit_model_v1.zip`**, or set **`HF_VIT_URL`** at build time.

- **Space sleeps**  
  Free tier may cold-start; allow 30–60 s and a generous HTTP timeout on the backend.
