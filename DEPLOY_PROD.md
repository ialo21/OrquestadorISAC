# Guía de Despliegue en Producción - VM Windows

## Configuración de Red

La aplicación está desplegada en una VM Windows (IP: `10.43.4.9`) dentro de un host.

### Variables de Entorno

#### Backend (`backend\.env`)
```env
GOOGLE_CLIENT_ID="<obtener_de_google_cloud_console>"
GOOGLE_CLIENT_SECRET="<obtener_de_google_cloud_console>"
GOOGLE_REDIRECT_URI=http://10.43.4.9.nip.io:8002/api/auth/callback
JWT_SECRET=<generar_secreto_seguro>
SUPERADMIN_EMAIL=isautomation.center@interseguro.com.pe
ALLOWED_DOMAIN=interseguro.com.pe
FRONTEND_URL=http://10.43.4.9.nip.io:5175
MAX_HEADLESS_WORKERS=3
```

#### Frontend (`frontend\.env`)
```env
VITE_API_URL=http://10.43.4.9.nip.io:8002
```

## Checklist de Verificación

### 1. Firewall de Windows
Verificar que los puertos estén abiertos en la VM:
```powershell
# Verificar reglas existentes
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*8002*" -or $_.DisplayName -like "*5175*"}

# Crear reglas si no existen
New-NetFirewallRule -DisplayName "OrquestadorBots Backend" -Direction Inbound -LocalPort 8002 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OrquestadorBots Frontend" -Direction Inbound -LocalPort 5175 -Protocol TCP -Action Allow
```

### 2. Verificar que los servicios escuchen en todas las interfaces
```powershell
# Verificar puertos en escucha
netstat -ano | findstr ":8002"
netstat -ano | findstr ":5175"
```

Deberías ver `0.0.0.0:8002` y `0.0.0.0:5175` (no `127.0.0.1`)

### 3. Google OAuth Configuration
En Google Cloud Console (https://console.cloud.google.com):

1. Ir a **APIs & Services** > **Credentials**
2. Editar el OAuth 2.0 Client ID
3. Agregar a **Authorized redirect URIs**:
   - `http://10.43.4.9.nip.io:8002/api/auth/callback`
4. Agregar a **Authorized JavaScript origins**:
   - `http://10.43.4.9.nip.io:5175`
   - `http://10.43.4.9.nip.io:8002`

### 4. Verificar acceso desde el host
Desde el host que contiene la VM, probar:
```powershell
# Probar backend
curl http://10.43.4.9:8002/api/health

# Probar frontend
curl http://10.43.4.9:5175
```

### 5. Verificar DNS nip.io
```powershell
# Verificar resolución DNS
nslookup 10.43.4.9.nip.io
```

Debería resolver a `10.43.4.9`

## Problemas Comunes

### No se puede conectar desde fuera de la VM

**Causa**: Firewall de Windows bloqueando puertos
**Solución**: Ejecutar comandos del punto 1

### Error "Invalid redirect_uri" en Google OAuth

**Causa**: URI no registrada en Google Cloud Console
**Solución**: Seguir punto 3

### Frontend no carga o muestra error de red

**Causa**: Vite no está escuchando en todas las interfaces
**Solución**: Verificar que `start.bat` incluya `--host 0.0.0.0`

### Backend responde pero frontend no puede conectarse

**Causa**: CORS o URL incorrecta en frontend
**Solución**: Verificar que `VITE_API_URL` en `frontend\.env` sea correcto

## Comandos de Inicio

```batch
# Iniciar aplicación
start.bat

# Detener aplicación
stop.bat
```

## Verificación Post-Despliegue

1. Abrir navegador en: `http://10.43.4.9.nip.io:5175`
2. Hacer clic en "Iniciar sesión con Google"
3. Verificar que redirija correctamente a Google
4. Después de autenticar, verificar que regrese a la aplicación

## Logs

Los logs de ejecución se guardan en:
- Backend: Ventana de consola "OrquestadorBots-Backend"
- Frontend: Ventana de consola "OrquestadorBots-Frontend"
- Ejecuciones de bots: `backend\ejecuciones\<execution_id>\`
