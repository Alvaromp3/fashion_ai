# Cómo usar Cloudinary para guardar las fotos en la nube

Cuando Cloudinary está configurado, las imágenes de las prendas se suben a la nube en lugar de guardarse en la carpeta `uploads/` del servidor.

---

## Paso 1: Crear cuenta en Cloudinary

1. Entra en **https://cloudinary.com** y pulsa **Sign Up for Free**.
2. Regístrate con tu email (o Google/GitHub).
3. Confirma el email si te lo piden.

---

## Paso 2: Sacar las credenciales

1. En Cloudinary, entra en el **Dashboard** (tras iniciar sesión).
2. En la página principal verás un bloque tipo **Product Credentials** o **Account Details**.
3. Copia estos tres valores:
   - **Cloud name** → será `CLOUDINARY_CLOUD_NAME`
   - **API Key** → será `CLOUDINARY_API_KEY`
   - **API Secret** → será `CLOUDINARY_API_SECRET`  
     (puede estar oculto; haz clic en "Show" para verlo y copiarlo).

---

## Paso 3: Poner las variables en tu `.env`

Abre `backend/.env` y **descomenta y rellena** estas líneas (sustituye por tus valores reales):

```env
# Optional: Cloudinary (if set, uploads go to Cloudinary instead of uploads/)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

Ejemplo (con valores inventados):

```env
CLOUDINARY_CLOUD_NAME=dcxy1ab2e
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
```

Guarda el archivo.

---

## Paso 4: Reiniciar el backend

Para que cargue las nuevas variables:

```bash
# Si usas el script general:
./stop-all.sh
./start-all.sh

# O solo el backend:
cd backend
npm run dev
```

---

## Paso 5: Comprobar que funciona

1. Abre la app en el navegador (por ejemplo http://localhost:3000).
2. Añade una prenda nueva subiendo una foto (Garments → subir imagen).
3. En el **Dashboard de Cloudinary** → **Media Library** deberías ver la imagen en la carpeta **fashion_ai**.

Si la imagen aparece ahí, las fotos ya se están guardando en Cloudinary y sirviendo por su CDN.

---

## Resumen

| Sin Cloudinary | Con Cloudinary |
|----------------|----------------|
| Fotos en `backend/uploads/{userId}/` | Fotos en la nube (Cloudinary) |
| URL tipo `/uploads/userId/archivo.jpg` | URL tipo `https://res.cloudinary.com/...` |
| Dependes del disco del servidor | CDN y almacenamiento en la nube |

No hace falta cambiar código: con las tres variables en `.env`, el backend usa Cloudinary automáticamente.
