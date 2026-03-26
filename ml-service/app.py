"""Flask ML entrypoint: loads `fashion_ml` from `./src` (used by `hf-space/space_app.py` as `import app`)."""
from __future__ import annotations

import os
import sys
import threading
from pathlib import Path

import requests
_ML_DIR = os.path.dirname(os.path.abspath(__file__))
_SRC = os.path.join(_ML_DIR, "src")
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from fashion_ml import labels
from fashion_ml.config import VIT_MODEL_PATH
from fashion_ml.flask_app import app
from fashion_ml.image_ops import allowed_file, detect_color, logits_to_probs, preprocess_image
from fashion_ml.model_loader import models

# --- Legacy attributes (space_app.py, tests) ---
model = None
vit_model = None
vit_input_size = 224
class_names = labels.CLASS_NAMES
class_to_tipo = labels.CLASS_TO_TIPO
tipo_por_indice = labels.TIPO_POR_INDICE
KERAS_HUB_AVAILABLE = False


def preprocess_image_vit(image):
    return preprocess_image(image, target_size=models.vit_input_size, normalize=False)


def load_model():
    """Load ViT weights into process memory (call once)."""
    global model, vit_model, vit_input_size, KERAS_HUB_AVAILABLE
    models.load_classification_model(VIT_MODEL_PATH)
    model = models.vit
    vit_model = models.vit
    vit_input_size = models.vit_input_size
    KERAS_HUB_AVAILABLE = models.keras_hub_available


def _load_models_background():
    _ensure_vit_model_available()
    _log_model_diagnostics()
    load_model()
    if models.vit is not None:
        print("✅ ViT listo para clasificar.", flush=True)
    else:
        print("❌ ViT no está listo (revisa ML_VIT_PATH y logs).", flush=True)


def _is_git_lfs_pointer(path: Path) -> bool:
    try:
        if not path.is_file():
            return False
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            first = f.readline().strip()
            second = f.readline().strip()
        return first == "version https://git-lfs.github.com/spec/v1" and second.startswith("oid sha256:")
    except Exception:
        return False


def _log_model_diagnostics() -> None:
    model_env = os.environ.get("ML_VIT_PATH", "").strip()
    resolved = Path(VIT_MODEL_PATH)
    expected = Path("/app/models/best_model_17_marzo.keras")

    print(f"[diag] ML_VIT_PATH={model_env or '<unset>'}", flush=True)
    print(f"[diag] resolved_model_path={resolved}", flush=True)
    print(f"[diag] exists(resolved)={resolved.exists()}", flush=True)
    if resolved.exists():
        try:
            print(f"[diag] size(resolved)={resolved.stat().st_size} bytes", flush=True)
        except Exception as e:
            print(f"[diag] size(resolved)=<error: {e}>", flush=True)
    print(f"[diag] exists(/app/models/best_model_17_marzo.keras)={expected.exists()}", flush=True)
    if expected.exists():
        try:
            print(f"[diag] size(/app/models/best_model_17_marzo.keras)={expected.stat().st_size} bytes", flush=True)
        except Exception as e:
            print(f"[diag] size(/app/models/best_model_17_marzo.keras)=<error: {e}>", flush=True)

    app_dir = Path("/app")
    models_dir = Path("/app/models")
    try:
        print(f"[diag] /app entries={sorted(p.name for p in app_dir.iterdir())}", flush=True)
    except Exception as e:
        print(f"[diag] /app entries=<error: {e}>", flush=True)
    try:
        if models_dir.is_dir():
            print(f"[diag] /app/models entries={sorted(p.name for p in models_dir.iterdir())}", flush=True)
        else:
            print("[diag] /app/models entries=<dir missing>", flush=True)
    except Exception as e:
        print(f"[diag] /app/models entries=<error: {e}>", flush=True)

    if _is_git_lfs_pointer(resolved):
        print(f"[diag] WARNING: {resolved} is a Git LFS pointer file, not real model bytes.", flush=True)


def _github_release_download_url(repo: str, tag: str, asset_name: str) -> str:
    return f"https://github.com/{repo}/releases/download/{tag}/{asset_name}"


def _headers_for_github(token: str) -> dict[str, str]:
    headers: dict[str, str] = {"User-Agent": "fashion-ai-ml/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _download_model_direct(url: str, dest: Path, token: str) -> None:
    with requests.get(url, headers=_headers_for_github(token), stream=True, timeout=120) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def _download_model_via_api(repo: str, tag: str, asset_name: str, dest: Path, token: str) -> None:
    if not token:
        raise RuntimeError("GITHUB_TOKEN requerido para fallback API en releases privados")
    release_url = f"https://api.github.com/repos/{repo}/releases/tags/{tag}"
    release = requests.get(release_url, headers=_headers_for_github(token), timeout=30)
    release.raise_for_status()
    assets = release.json().get("assets", [])
    asset = next((a for a in assets if a.get("name") == asset_name), None)
    if not asset:
        raise FileNotFoundError(f"Asset no encontrado en release: {asset_name}")
    asset_api_url = asset["url"]
    headers = _headers_for_github(token)
    headers["Accept"] = "application/octet-stream"
    with requests.get(asset_api_url, headers=headers, stream=True, timeout=120) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def _ensure_vit_model_available() -> None:
    target = Path(VIT_MODEL_PATH)
    target.parent.mkdir(parents=True, exist_ok=True)

    repo = os.environ.get("GITHUB_REPO", "Alvaromp3/fashion_ai").strip() or "Alvaromp3/fashion_ai"
    tag = os.environ.get("MODELS_RELEASE_TAG", "models-v1.0").strip() or "models-v1.0"
    asset_name = os.environ.get("MODEL_ASSET_NAME", "best_model_17_marzo.keras").strip() or "best_model_17_marzo.keras"
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    direct_url = _github_release_download_url(repo, tag, asset_name)

    print(f"[model] GITHUB_REPO={repo}", flush=True)
    print(f"[model] MODELS_RELEASE_TAG={tag}", flush=True)
    print(f"[model] expected_asset={asset_name}", flush=True)
    print(f"[model] download_url={direct_url}", flush=True)
    print(f"[model] local_path={target}", flush=True)

    # Skip download if we already have non-empty, non-LFS file.
    if target.is_file() and target.stat().st_size > 0 and not _is_git_lfs_pointer(target):
        print(f"[model] file already present, skipping download ({target.stat().st_size} bytes)", flush=True)
        return

    tmp = target.with_suffix(target.suffix + ".part")
    if tmp.exists():
        tmp.unlink()

    try:
        print("[model] downloading from GitHub release direct URL...", flush=True)
        _download_model_direct(direct_url, tmp, token)
    except Exception as direct_err:
        print(f"[model] direct download failed: {direct_err}", flush=True)
        try:
            print("[model] trying GitHub API asset download fallback...", flush=True)
            _download_model_via_api(repo, tag, asset_name, tmp, token)
        except Exception as api_err:
            if tmp.exists():
                tmp.unlink()
            print(f"[model] ERROR: failed to download model via direct URL and API fallback: {api_err}", flush=True)
            return

    tmp.replace(target)
    exists = target.exists()
    size = target.stat().st_size if exists else 0
    print(f"[model] download complete: exists={exists}", flush=True)
    if exists:
        print(f"[model] local_size={size} bytes", flush=True)
    if _is_git_lfs_pointer(target):
        print("[model] ERROR: downloaded file is a Git LFS pointer, not model bytes.", flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6001))
    print("Fashion AI ML Service", flush=True)
    print(f"Loading ViT model from {VIT_MODEL_PATH}", flush=True)
    print(f"Binding to http://0.0.0.0:{port} (models loading in background)...", flush=True)
    t = threading.Thread(target=_load_models_background, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
