"""Preprocessing, color heuristic, and probability conversion."""

from __future__ import annotations

import numpy as np
from PIL import Image

from fashion_ml.config import IMG_SIZE


def preprocess_image(
    image: Image.Image,
    target_size: int = IMG_SIZE,
    normalize: bool = True,
) -> np.ndarray:
    if image.mode != "RGB":
        image = image.convert("RGB")

    width, height = image.size

    if width < target_size or height < target_size:
        if width < height:
            new_width = target_size
            new_height = int(height * (target_size / width))
        else:
            new_height = target_size
            new_width = int(width * (target_size / height))
        image = image.resize((new_width, new_height), Image.LANCZOS)
        width, height = image.size

    if width != target_size or height != target_size:
        left = (width - target_size) / 2
        top = (height - target_size) / 2
        right = (width + target_size) / 2
        bottom = (height + target_size) / 2
        image = image.crop((left, top, right, bottom))

    image = image.resize((target_size, target_size), Image.LANCZOS)
    img_array = np.array(image)

    if normalize:
        img_array = img_array.astype("float32") / 255.0
    else:
        img_array = img_array.astype("float32")

    return np.expand_dims(img_array, axis=0)


def logits_to_probs(logits) -> np.ndarray:
    x = np.asarray(logits, dtype=np.float64).ravel()
    x = x - x.max()
    exp_x = np.exp(x)
    return exp_x / exp_x.sum()


def detect_color(image: Image.Image) -> str:
    try:
        img_array = np.array(image)
        img_small = Image.fromarray(img_array).resize((400, 400))
        img_array = np.array(img_small)

        if len(img_array.shape) == 3 and img_array.shape[2] == 4:
            alpha = img_array[:, :, 3]
            mask = alpha > 128
            img_array = img_array[mask][:, :3]
            if len(img_array) == 0:
                return "desconocido"

        height, width = img_array.shape[:2]
        border_width = max(8, int(min(height, width) * 0.12))
        border_pixels = []

        border_pixels.extend(img_array[0:border_width, :].reshape(-1, 3))
        border_pixels.extend(img_array[-border_width:, :].reshape(-1, 3))
        border_pixels.extend(img_array[:, 0:border_width].reshape(-1, 3))
        border_pixels.extend(img_array[:, -border_width:].reshape(-1, 3))

        border_pixels = np.array(border_pixels)

        if len(border_pixels) > 0:
            border_rounded = (border_pixels / 15).astype(int) * 15
            unique_colors, counts = np.unique(border_rounded, axis=0, return_counts=True)
            bg_color = unique_colors[np.argsort(counts)[-1]].astype(float)
        else:
            bg_color = np.array([255.0, 255.0, 255.0])

        img_flat = img_array.reshape(-1, 3).astype(np.float32)
        distances = np.sqrt(np.sum((img_flat - bg_color) ** 2, axis=1))

        bg_brightness = np.mean(bg_color) / 255.0
        threshold = 55 if bg_brightness > 0.85 else (35 if bg_brightness < 0.2 else 45)

        object_mask = distances > threshold
        center_y, center_x = height // 2, width // 2
        center_region_size = int(min(height, width) / 2.5)
        center_mask = np.zeros((height, width), dtype=bool)
        y_start, y_end = max(0, center_y - center_region_size), min(height, center_y + center_region_size)
        x_start, x_end = max(0, center_x - center_region_size), min(width, center_x + center_region_size)
        center_mask[y_start:y_end, x_start:x_end] = True

        final_mask = object_mask & center_mask.reshape(-1)

        if np.sum(final_mask) < 100:
            pixels = img_flat[object_mask] if np.sum(object_mask) >= 100 else img_flat
        else:
            pixels = img_flat[final_mask]

        if len(pixels) == 0:
            return "desconocido"

        try:
            from sklearn.cluster import KMeans

            sample_size = min(3000, len(pixels))
            if sample_size >= 30:
                sample_indices = np.random.choice(len(pixels), sample_size, replace=False)
                kmeans = KMeans(n_clusters=min(7, max(3, sample_size // 40)), random_state=42, n_init=15)
                kmeans.fit(pixels[sample_indices])
                labels = kmeans.predict(pixels)
                cluster_counts = np.bincount(labels)
                dominant_color = kmeans.cluster_centers_[np.argmax(cluster_counts)]
                r_avg, g_avg, b_avg = dominant_color
            else:
                r_avg, g_avg, b_avg = np.mean(pixels, axis=0)
        except Exception:
            r_avg, g_avg, b_avg = np.mean(pixels, axis=0)

        max_ch, min_ch = max(r_avg, g_avg, b_avg), min(r_avg, g_avg, b_avg)
        delta = max_ch - min_ch
        brightness = max_ch / 255.0
        saturation = (delta / max_ch) if max_ch > 0 else 0

        if delta == 0:
            hue = 0
        elif max_ch == r_avg:
            hue = 60 * (((g_avg - b_avg) / delta) % 6)
        elif max_ch == g_avg:
            hue = 60 * (((b_avg - r_avg) / delta) + 2)
        else:
            hue = 60 * (((r_avg - g_avg) / delta) + 4)
        hue = hue / 360.0

        if brightness < 0.22 or (saturation < 0.12 and brightness < 0.32):
            return "negro"
        if brightness > 0.94 and saturation < 0.06:
            return "blanco"
        if saturation < 0.1:
            return "negro" if brightness < 0.35 else ("blanco" if brightness > 0.88 else "gris")

        if saturation > 0.28:
            if hue < 0.07 or hue > 0.93:
                return "rojo" if brightness > 0.55 else "rojo oscuro"
            if 0.05 < hue < 0.12:
                return "naranja" if brightness > 0.48 else "marrón"
            if 0.12 < hue < 0.20:
                return "amarillo" if brightness > 0.48 else "amarillo oscuro"
            if 0.20 < hue < 0.48:
                return "verde" if brightness > 0.48 else "verde oscuro"
            if 0.48 < hue < 0.72:
                return "azul" if brightness > 0.48 else "azul oscuro"
            if 0.72 < hue < 0.93:
                return "rosa" if brightness > 0.68 else "magenta"

        if 0.05 < hue < 0.12 and saturation < 0.42 and brightness < 0.58:
            return "marrón"
        if brightness > 0.72 and saturation < 0.28:
            return "beige"

        return "gris" if saturation < 0.18 else "multicolor"
    except Exception:
        return "desconocido"


def allowed_file(filename: str, allowed: frozenset | None = None) -> bool:
    from fashion_ml.config import ALLOWED_EXTENSIONS

    exts = allowed if allowed is not None else ALLOWED_EXTENSIONS
    return "." in filename and filename.rsplit(".", 1)[1].lower() in exts
