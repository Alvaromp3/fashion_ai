# 🚀 Inicio Rápido - Fashion AI

Guía rápida para poner en marcha el proyecto.

## 🐳 Opción recomendada: ML en Docker (CNN + ViT)

Si quieres que **CNN y ViT funcionen siempre**, usa Docker solo para el ML:

```bash
./start-all-docker.sh
```

Abre http://localhost:3000. Detalles en `DOCKER_OPTIONS.md`.

---

## ⚡ Pasos Rápidos (sin Docker)

### 1. Instalar Dependencias

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Servicio ML
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Configurar MongoDB

**Opción A: MongoDB Local**

```bash
# Instalar MongoDB localmente
# Luego en backend/.env:
MONGODB_URI=mongodb://localhost:27017/fashion_ai
```

**Opción B: MongoDB Atlas (Recomendado)**

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear cluster gratuito
3. Obtener connection string
4. En `backend/.env`:

```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/fashion_ai
```

### 3. Preparar el Modelo CNN

```bash
cd ml-service

# Opción 1: Usar el script de entrenamiento
# (Ajusta DATASET_PATH en train_model.py)
python train_model.py

# Opción 2: Si ya tienes el modelo entrenado
# Copia tu modelo_ropa.h5 a ml-service/
```

**Importante**: Actualiza `class_names` en `ml-service/app.py` según tus clases.

### 4. Configurar Variables de Entorno

Crea `backend/.env` con las variables necesarias (PORT, MONGODB_URI, ML_SERVICE_URL, NODE_ENV, OpenRouter, Auth0). Ver `backend/README-AUTH.md` para login con Auth0.

### 5. Ejecutar Todo

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Servicio ML:**

```bash
cd ml-service
source venv/bin/activate
python app.py
```

**Terminal 3 - Frontend:**

```bash
cd frontend
npm run dev
```

### 6. Abrir en el Navegador

```
http://localhost:3000
```

## ✅ Arranque con un solo comando

Si quieres levantar todo de una vez (backend, ML y frontend):

```bash
# 1. Cerrar todo y liberar puertos
./stop-all.sh

# 2. Esperar 2–3 segundos y arrancar
./start-all.sh

# 3. Esperar ~15 s y comprobar
./check-ports.sh
```

Luego abre **http://localhost:3000** en el navegador. Para parar todo: `Ctrl+C` en la terminal donde corre `start-all.sh`.

## ✅ Verificar que Todo Funciona

1. **Backend**: `http://localhost:4000/api/health` → Debe responder `{"status":"OK"}` o `{"status":"DEGRADED"}`
2. **ML Service**: `http://localhost:6001/health` → Debe responder con estado del modelo
3. **Frontend**: `http://localhost:3000` → Debe cargar la página

## 🐛 Problemas Comunes

### "Cannot connect to MongoDB"

- Verifica que MongoDB esté corriendo
- Revisa la URI en `.env`

### "ML Service not responding"

- Verifica que el servicio ML esté en puerto 6001
- Verifica que `modelo_ropa.h5` exista en `ml-service/`

### "Images not loading"

- Si usas almacenamiento local, crea `backend/uploads/`
- Si usas Cloudinary, configura las credenciales en `.env`

## 📝 Próximos Pasos

1. Sube tu primera prenda desde el Dashboard
2. Genera algunos outfits
3. Explora las funcionalidades

¡Listo! 🎉
