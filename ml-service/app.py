from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import io
import os
import sys
import threading

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'temp'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif'}
IMG_SIZE = 224

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

model = None
vit_model = None
vit_input_size = IMG_SIZE
class_names = None
class_to_tipo = None
tipo_por_indice = None
KERAS_HUB_AVAILABLE = False

# Rutas de modelos: SIEMPRE estas rutas absolutas
_DEFAULT_CNN = '/Users/alvaromartin-pena/Desktop/fashion_ai_clean/ml-service/modelo_ropa.h5'
_DEFAULT_VIT = '/Users/alvaromartin-pena/Desktop/fashion_ai_clean/ml-service/vision_transformer_moda_modelo.keras'
CNN_MODEL_PATH = os.path.abspath(os.environ.get('ML_CNN_PATH', _DEFAULT_CNN))
VIT_MODEL_PATH = os.path.abspath(os.environ.get('ML_VIT_PATH', _DEFAULT_VIT))
# Si no existen en la ruta por defecto, intentar relativo al directorio de este script
_ML_DIR = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(CNN_MODEL_PATH):
    CNN_MODEL_PATH = os.path.abspath(os.path.join(_ML_DIR, 'modelo_ropa.h5'))
if not os.path.exists(VIT_MODEL_PATH):
    VIT_MODEL_PATH = os.path.abspath(os.path.join(_ML_DIR, 'vision_transformer_moda_modelo.keras'))

def load_model():
    global model, vit_model, vit_input_size, class_names, class_to_tipo, tipo_por_indice, KERAS_HUB_AVAILABLE
    import tensorflow as tf
    try:
        import keras_hub
        import importlib
        for mod_name in [
            'keras_hub.models.vit.vit_image_classifier',
            'keras_hub.models.vit.vit_backbone',
            'keras_hub.models.vit.vit_image_classifier_preprocessor',
            'keras_hub.models.vit.vit_image_converter',
            'keras_hub.src.models.vit.vit_image_classifier',
            'keras_hub.src.models.vit.vit_backbone',
        ]:
            try:
                importlib.import_module(mod_name)
            except Exception:
                pass
        KERAS_HUB_AVAILABLE = True
    except ImportError:
        KERAS_HUB_AVAILABLE = False
        keras_hub = None

    model_path = os.path.abspath(os.path.realpath(CNN_MODEL_PATH))
    print(f"   Loading CNN: {model_path}", flush=True)
    if os.path.exists(model_path):
        try:
            model = tf.keras.models.load_model(model_path, compile=False)
            print(f"✅ CNN loaded ({os.path.getsize(model_path) / (1024*1024):.1f} MB)", flush=True)
        except Exception as e1:
            try:
                model = tf.keras.models.load_model(model_path)
                print(f"✅ CNN model loaded: {model_path} ({os.path.getsize(model_path) / (1024*1024):.2f} MB)")
            except Exception as e2:
                import traceback
                print(f"❌ CNN load error: {e1}", flush=True)
                traceback.print_exc()
                model = None
    else:
        print(f"❌ CNN not found: {model_path}", flush=True)
        model = None

    vit_model_path = os.path.abspath(os.path.realpath(VIT_MODEL_PATH))
    print(f"   Loading ViT: {vit_model_path}", flush=True)
    if os.path.exists(vit_model_path):
        vit_custom_objects = {}
        if KERAS_HUB_AVAILABLE:
            try:
                # Registrar todas las clases de keras_hub (models, layers y submodulos vit)
                for mod in [getattr(keras_hub, 'models', None), getattr(keras_hub, 'layers', None)]:
                    if mod is None:
                        continue
                    for name in dir(mod):
                        if name.startswith('_'):
                            continue
                        obj = getattr(mod, name)
                        if isinstance(obj, type):
                            vit_custom_objects[name] = obj
                            vit_custom_objects[f"keras_hub>{name}"] = obj
                # Importar módulo vit para que ViTImageClassifier quede registrado
                vit_mod = getattr(getattr(keras_hub, 'models', None), 'vit', None)
                if vit_mod is not None:
                    for name in dir(vit_mod):
                        if name.startswith('_'):
                            continue
                        obj = getattr(vit_mod, name)
                        if isinstance(obj, type):
                            vit_custom_objects[name] = obj
                            vit_custom_objects[f"keras_hub>{name}"] = obj
            except Exception:
                pass
        vit_loaded = False
        vit_model = None
        vit_last_error = None
        # 1) tf.keras con safe_mode=False (muchos .keras cargan así sin custom_objects)
        try:
            vit_model = tf.keras.models.load_model(
                vit_model_path, compile=False, safe_mode=False
            )
            if vit_model is not None:
                vit_loaded = True
        except (TypeError, Exception) as e0:
            vit_last_error = e0
            vit_model = None
        # 2) tf.keras con custom_objects (para ViT de keras_hub)
        if not vit_loaded and vit_custom_objects:
            try:
                vit_model = tf.keras.models.load_model(
                    vit_model_path, compile=False, custom_objects=vit_custom_objects
                )
                vit_loaded = True
            except Exception as e2:
                vit_last_error = e2
                vit_model = None
        # 3) Keras 3 con safe_mode=False
        if not vit_loaded:
            try:
                import keras as k3
                try:
                    vit_model = k3.models.load_model(vit_model_path, compile=False, safe_mode=False)
                except TypeError:
                    vit_model = k3.models.load_model(vit_model_path, compile=False)
                if vit_model is not None:
                    vit_loaded = True
            except Exception as e1:
                vit_last_error = e1
        # 4) tf.keras sin safe_mode (Keras 2)
        if not vit_loaded:
            try:
                vit_model = tf.keras.models.load_model(vit_model_path, compile=False)
                vit_loaded = True
            except (TypeError, Exception) as e3:
                vit_last_error = e3
                vit_model = None
        if vit_loaded and vit_model is not None:
            print(f"✅ ViT loaded ({os.path.getsize(vit_model_path) / (1024*1024):.1f} MB)", flush=True)
            if vit_model.input_shape and len(vit_model.input_shape) >= 3:
                detected_size = vit_model.input_shape[1]
                if detected_size and detected_size > 0:
                    vit_input_size = detected_size
        else:
            vit_model = None
            err_msg = str(vit_last_error) if vit_last_error else "unknown"
            print(f"⚠️ ViT no cargó; solo CNN. Error: {err_msg[:150]}", flush=True)
            if not KERAS_HUB_AVAILABLE:
                print("   pip install keras-hub para ViT", flush=True)
    else:
        print(f"❌ ViT not found: {vit_model_path}", flush=True)
        vit_model = None
    
    class_names = ['Ankle_boot', 'Bag', 'Coat', 'Dress', 'Pullover', 'Sandal', 'Shirt', 'Sneaker', 'T-shirt', 'Trouser']
    
    class_to_tipo = {
        'Ankle_boot': 'zapatos', 'Bag': 'accesorio', 'Coat': 'abrigo', 'Dress': 'vestido',
        'Pullover': 'superior', 'Sandal': 'zapatos', 'Shirt': 'superior', 'Sneaker': 'zapatos',
        'T-shirt': 'superior', 'Trouser': 'inferior'
    }
    
    tipo_por_indice = {
        0: 'zapatos', 1: 'accesorio', 2: 'abrigo', 3: 'vestido', 4: 'superior',
        5: 'zapatos', 6: 'superior', 7: 'zapatos', 8: 'superior', 9: 'inferior'
    }

def preprocess_image(image, target_size=IMG_SIZE, normalize=True):
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
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
        img_array = img_array.astype('float32') / 255.0
    else:
        img_array = img_array.astype('float32')
    
    return np.expand_dims(img_array, axis=0)

def preprocess_image_vit(image):
    return preprocess_image(image, target_size=vit_input_size, normalize=False)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def logits_to_probs(logits):
    """Convierte logits del modelo en probabilidades (0-1) con softmax."""
    x = np.asarray(logits, dtype=np.float64).ravel()
    x = x - x.max()
    exp_x = np.exp(x)
    return exp_x / exp_x.sum()

def detect_color(image):
    try:
        img_array = np.array(image)
        img_small = Image.fromarray(img_array).resize((400, 400))
        img_array = np.array(img_small)
        
        if len(img_array.shape) == 3 and img_array.shape[2] == 4:
            alpha = img_array[:, :, 3]
            mask = alpha > 128
            img_array = img_array[mask][:, :3]
            if len(img_array) == 0:
                return 'desconocido'
        
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
            return 'desconocido'
        
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
        except:
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
            return 'negro'
        if brightness > 0.94 and saturation < 0.06:
            return 'blanco'
        if saturation < 0.1:
            return 'negro' if brightness < 0.35 else ('blanco' if brightness > 0.88 else 'gris')
        
        if saturation > 0.28:
            if hue < 0.07 or hue > 0.93:
                return 'rojo' if brightness > 0.55 else 'rojo oscuro'
            elif 0.05 < hue < 0.12:
                return 'naranja' if brightness > 0.48 else 'marrón'
            elif 0.12 < hue < 0.20:
                return 'amarillo' if brightness > 0.48 else 'amarillo oscuro'
            elif 0.20 < hue < 0.48:
                return 'verde' if brightness > 0.48 else 'verde oscuro'
            elif 0.48 < hue < 0.72:
                return 'azul' if brightness > 0.48 else 'azul oscuro'
            elif 0.72 < hue < 0.93:
                return 'rosa' if brightness > 0.68 else 'magenta'
        
        if 0.05 < hue < 0.12 and saturation < 0.42 and brightness < 0.58:
            return 'marrón'
        if brightness > 0.72 and saturation < 0.28:
            return 'beige'
        
        return 'gris' if saturation < 0.18 else 'multicolor'
        
    except:
        return 'desconocido'

@app.route('/health', methods=['GET'])
def health():
    model_path = CNN_MODEL_PATH
    vit_model_path = VIT_MODEL_PATH
    
    return jsonify({
        'status': 'OK',
        'model_loaded': model is not None,
        'model_file_exists': os.path.exists(model_path),
        'model_path': os.path.abspath(model_path) if os.path.exists(model_path) else None,
        'vit_model_loaded': vit_model is not None,
        'vit_model_file_exists': os.path.exists(vit_model_path),
        'vit_model_path': os.path.abspath(vit_model_path) if os.path.exists(vit_model_path) else None,
        'classes_count': len(class_names) if class_names else 0
    })

@app.route('/classify', methods=['POST'])
def classify():
    """Clasificación con el modelo CNN: modelo_ropa.h5 (siempre desde CNN_MODEL_PATH)."""
    try:
        if 'imagen' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['imagen']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file'}), 400
        
        image = Image.open(io.BytesIO(file.read()))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        color = detect_color(image)
        top3_info = []
        # Siempre usa el modelo CNN cargado desde CNN_MODEL_PATH (modelo_ropa.h5)
        if model is None:
            return jsonify({'error': 'Models still loading', 'loading': True}), 503

        img_array = preprocess_image(image)
        prediction = model.predict(img_array, verbose=0)
        out = prediction[0] if isinstance(prediction, (list, tuple)) else prediction
        logits = np.asarray(out).ravel()
        if len(logits) != 10:
            logits = np.asarray(prediction).ravel()[:10]
        if len(logits) < 10:
            logits = np.zeros(10, dtype=np.float64)
            logits[0] = 1.0
        probs = logits_to_probs(logits)
        clase = int(np.argmax(probs))
        confianza = float(probs[clase])
        top3_indices = np.argsort(probs)[-3:][::-1]
        for idx in top3_indices:
            if idx < len(class_names):
                top3_info.append({
                    'clase_nombre': class_names[idx],
                    'confianza': float(probs[idx]),
                    'tipo': class_to_tipo.get(class_names[idx], 'desconocido')
                })
        clase_nombre = class_names[clase] if clase < len(class_names) else 'desconocido'
        tipo = class_to_tipo.get(clase_nombre, tipo_por_indice.get(clase, 'desconocido'))

        return jsonify({
            'clase': int(clase),
            'clase_nombre': clase_nombre,
            'tipo': tipo,
            'confianza': float(confianza),
            'color': color,
            'top3': top3_info,
            'model': 'cnn',
            'model_file': os.path.basename(CNN_MODEL_PATH)
        })
    
    except Exception as e:
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

@app.route('/classify-vit', methods=['POST'])
def classify_vit():
    """Clasificación con el modelo ViT: vision_transformer_moda_modelo.keras (siempre desde VIT_MODEL_PATH)."""
    try:
        if 'imagen' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['imagen']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file'}), 400
        
        image = Image.open(io.BytesIO(file.read()))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        color = detect_color(image)
        top3_info = []
        # Siempre usa el modelo ViT cargado desde VIT_MODEL_PATH (vision_transformer_moda_modelo.keras)
        if vit_model is None:
            return jsonify({'error': 'Vision Transformer model not available', 'model_loaded': False}), 503
        
        img_array = preprocess_image_vit(image)
        prediction = vit_model.predict(img_array, verbose=0)
        out = prediction[0] if isinstance(prediction, (list, tuple)) else prediction
        logits = np.asarray(out).ravel()
        if len(logits) != 10:
            logits = np.asarray(prediction).ravel()[:10]
        if len(logits) < 10:
            logits = np.zeros(10, dtype=np.float64)
            logits[0] = 1.0
        probs = logits_to_probs(logits)
        clase = int(np.argmax(probs))
        confianza = float(probs[clase])
        
        top3_indices = np.argsort(probs)[-3:][::-1]
        for idx in top3_indices:
            if idx < len(class_names):
                top3_info.append({
                    'clase_nombre': class_names[idx],
                    'confianza': float(probs[idx]),
                    'tipo': class_to_tipo.get(class_names[idx], 'desconocido')
                })
        
        clase_nombre = class_names[clase] if clase < len(class_names) else 'desconocido'
        tipo = class_to_tipo.get(clase_nombre, tipo_por_indice.get(clase, 'desconocido'))
        
        return jsonify({
            'clase': int(clase),
            'clase_nombre': clase_nombre,
            'tipo': tipo,
            'confianza': float(confianza),
            'color': color,
            'top3': top3_info,
            'model': 'vision_transformer',
            'model_file': os.path.basename(VIT_MODEL_PATH)
        })
    
    except Exception as e:
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

def _load_models_background():
    """Carga modelos en segundo plano; el servidor ya está escuchando en 5001."""
    load_model()
    if model is not None:
        print("✅ CNN listo para clasificar.", flush=True)
    if vit_model is not None:
        print("✅ ViT listo para clasificar.", flush=True)
    elif os.path.exists(VIT_MODEL_PATH):
        print("⚠️ ViT no cargó; solo CNN. pip install keras-hub para ViT.", flush=True)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print("🚀 Fashion AI ML Service", flush=True)
    print(f"   CNN: {CNN_MODEL_PATH}", flush=True)
    print(f"   ViT: {VIT_MODEL_PATH}", flush=True)
    if not os.path.exists(CNN_MODEL_PATH):
        print(f"❌ CNN no encontrado: {CNN_MODEL_PATH}", flush=True)
        sys.exit(1)
    if not os.path.exists(VIT_MODEL_PATH):
        print(f"❌ ViT no encontrado: {VIT_MODEL_PATH}", flush=True)
        sys.exit(1)
    print(f"🌐 Binding to http://0.0.0.0:{port} (models loading in background)...", flush=True)
    t = threading.Thread(target=_load_models_background, daemon=True)
    t.start()
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
