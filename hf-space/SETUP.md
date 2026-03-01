# Hugging Face Space — setup steps

This folder is ready to deploy as a **Hugging Face Space**. Do the following.

## 1. Create a GitHub Release with the model files

Your model files (`modelo_ropa.h5`, `vision_transformer_moda_modelo.keras`) are not in Git. Host them on a GitHub Release:

1. Open your **fashion_ai** repo on GitHub.
2. Go to **Releases** → **Create a new release**.
3. **Choose a tag:** e.g. `models-v1.0` (create new tag).
4. **Upload assets:** drag and drop:
   - `modelo_ropa.h5`
   - `vision_transformer_moda_modelo.keras`
5. Publish the release.

## 2. Create the Space on Hugging Face

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and log in.
2. Click **Create new Space**.
3. **Space name:** e.g. `fashion-ai-ml`.
4. **Select SDK:** choose **Docker**.
5. **License:** pick one (e.g. MIT). Click **Create Space**.

## 3. Add the files to the Space

You can either **push the contents of `hf-space/` to the Space repo** or **upload files in the UI**.

### Option A: Clone the Space repo and push (recommended)

1. HF will show you the Space repo URL, e.g. `https://huggingface.co/spaces/YOUR_USERNAME/fashion-ai-ml`.
2. Clone it (use a [HF token](https://huggingface.co/settings/tokens) for Git):
   ```bash
   git clone https://YOUR_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/YOUR_USERNAME/fashion-ai-ml
   cd fashion-ai-ml
   ```
3. Copy everything from your local **hf-space** folder into this repo:
   - `Dockerfile`
   - `README.md`
   - `requirements.txt`
   - `app.py`
   - `space_app.py`
   - `scripts/download_models.sh`
4. Commit and push:
   ```bash
   git add .
   git commit -m "Add Fashion AI ML Space"
   git push
   ```

### Option B: Upload in the browser

1. In your Space page, open **Files and versions**.
2. Upload or create:
   - `Dockerfile` (copy from `hf-space/Dockerfile`)
   - `README.md` (copy from `hf-space/README.md`)
   - `requirements.txt`
   - `app.py`
   - `space_app.py`
   - `scripts/download_models.sh` (create folder `scripts`, then upload)

## 4. Set your GitHub repo and (optional) secrets

The Dockerfile downloads models from a **GitHub Release** at build time. The default repo in the Dockerfile is `Alvaromp3/fashion_ai`.

- **If that’s your repo (and it’s public):** do nothing; the build will use it.
- **If you use a different repo:** edit **Dockerfile** and change the line:
  ```dockerfile
  ARG GITHUB_REPO=Alvaromp3/fashion_ai
  ```
  to your repo, e.g. `ARG GITHUB_REPO=YOUR_USERNAME/fashion_ai`. Set **MODELS_RELEASE_TAG** to the release tag you used in step 1 (default is `models-v1.0`).
- **If the repo is private:** add a **Repository secret** in the Space **Settings**:
  - **GITHUB_TOKEN** = a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.  
  You may also need to pass **GITHUB_REPO** and **MODELS_RELEASE_TAG** as build args if your Space supports it; otherwise set them in the Dockerfile.

**Variables** (optional, for runtime): in Space **Settings → Variables**, add **CORS_ORIGINS** = your frontend URL or `*` for testing.

## 5. Build and run

1. Go back to the Space **App** tab.
2. HF will build the Docker image (first time can take 10–15 minutes: TensorFlow is large).
3. When it’s ready, you’ll see “Building” then “Running”. The API is at:
   - `https://YOUR_USERNAME-fashion-ai-ml.hf.space`  
   (or the URL shown on the Space page.)

## 6. Use the Space URL in your backend

Set your backend’s **ML_SERVICE_URL** to the Space URL, e.g.:

```env
ML_SERVICE_URL=https://YOUR_USERNAME-fashion-ai-ml.hf.space
```

No path needed — the backend calls `ML_SERVICE_URL/classify` and `ML_SERVICE_URL/classify-vit`.

## Troubleshooting

- **Build fails with “GITHUB_REPO not set”**  
  Add **GITHUB_REPO** under **Settings → Repository secrets**, then trigger a new build (e.g. push a small change or use “Clear build cache” if available).

- **“Failed to download modelo_ropa.h5”**  
  Check that the release tag and file names match exactly, and that the release has the two assets. For a private repo, set **GITHUB_TOKEN**.

- **Space sleeps**  
  On the free tier the Space may sleep after inactivity. The next request may take 30–60 seconds to wake it; your backend timeout should allow for that (e.g. 30s+).
