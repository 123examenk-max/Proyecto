# Guía de Despliegue en Producción

## Estructura

- **Backend (Node.js + Socket.IO)**: Render.com o Railway.dev
- **Frontend (HTML/CSS/JS)**: Netlify
- Se comunican vía WebSocket (wss)

---

## Paso 1: Preparar GitHub

### 1.1 Crear repositorio en GitHub
```bash
# Si no existe, crear repo en GitHub
git init
git add .
git commit -m "Initial commit: TrackLive multi-user location tracking"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tu-repo.git
git push -u origin main
```

### 1.2 Archivos necesarios (ya incluidos)
- ✅ `Procfile` — Le dice a Render/Railway cómo ejecutar la app
- ✅ `server.js` — Backend con `process.env.PORT`
- ✅ `public/` — Frontend
- ✅ `.env.example` — Variables de entorno

---

## Paso 2: Desplegar Backend en Render.com (Recomendado)

### 2.1 Crear cuenta
1. Ir a https://render.com
2. Registrarse con GitHub

### 2.2 Crear nuevo Web Service
1. Dashboard → "New +" → "Web Service"
2. Seleccionar tu repositorio
3. **Configurar:**
   - **Name**: `tracklive-backend` (o lo que quieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (gratuito con limitaciones)
4. Click "Create Web Service"
5. Esperar a que termine el deploy (~2 min)
6. **Copiar la URL pública** (ej: `https://tracklive-backend.onrender.com`)

**Nota:** El plan free dormirá si no hay actividad por 15 min (primera carga puede tardar).

---

## Paso 3: Desplegar Frontend en Netlify

### 3.1 Crear cuenta
1. Ir a https://netlify.com
2. Registrarse con GitHub

### 3.2 Conectar repositorio
1. Netlify Dashboard → "Add new site" → "Import an existing project"
2. Seleccionar GitHub
3. Seleccionar tu repositorio
4. **Configurar:**
   - **Base directory**: (dejar vacío)
   - **Build command**: (dejar vacío)
   - **Publish directory**: `public`
5. Click "Deploy site"
6. Esperar a que termine (~1 min)
7. **Copiar la URL** (ej: `https://mi-app-123.netlify.app`)

---

## Paso 4: Conectar Frontend ↔ Backend

### 4.1 Configurar BACKEND_URL en Netlify
1. En Netlify Dashboard → Site settings → Build & deploy → Environment
2. **Add environment variable:**
   - Key: `BACKEND_URL`
   - Value: `https://tracklive-backend.onrender.com` (tu URL de Render)
3. Trigger manual redeploy:
   - Deployments → Trigger deploy → Deploy site

### 4.2 Alternativa: Configurar manualmente en el navegador
Abre la consola del navegador y ejecuta:
```javascript
localStorage.setItem('BACKEND_URL', 'https://tracklive-backend.onrender.com');
location.reload();
```

---

## Paso 5: Probar desde Celular

1. Abre `https://mi-app-123.netlify.app` desde un celular (con GPS)
2. Concede permiso de ubicación
3. Abre la misma URL desde otro celular/navegador
4. Ambos deberían verse mutuamente en el mapa

---

## Troubleshooting

### "Página no encontrada" en Netlify
- Verifica que `netlify.toml` existe y tiene:
  ```toml
  [build]
    command = "echo 'No build needed'"
    publish = "public"
  ```

### WebSocket no conecta
- Verifica que la URL de backend es `https://` (no http)
- Asegúrate que `BACKEND_URL` está configurada correctamente
- Abre consola del navegador y verifica los logs

### Render durmiendo
- El plan free hiberna después de 15 min sin actividad
- Primera carga tardará ~30 seg (se despierta)
- Para evitar: cambiar a plan pagado (costo mínimo)

### GPS no funciona en desarrollo local
- Solo funciona en HTTPS (o localhost)
- En producción (Netlify) funciona con HTTPS automático
- Desde celular con IP pública y HTTPS funciona perfecto

---

## Variables de Entorno (Opcional)

Si necesitas configurar más variables en el backend, crea `.env`:
```
PORT=3000
BACKEND_URL=https://tracklive-backend.onrender.com
```

En Render/Railway, configura en "Environment" desde el dashboard.

---

## Recursos

- Render Docs: https://render.com/docs
- Netlify Docs: https://docs.netlify.com
- Socket.IO: https://socket.io/docs/

¡Listo! Tu app ahora es multi-usuario y funciona en producción. 🚀
