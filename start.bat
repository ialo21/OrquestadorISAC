@echo off
echo ============================================
echo  Orquestador de Bots - Interseguro
echo ============================================
echo.

:: Verificar que existe .env en backend
if not exist "%~dp0backend\.env" (
    echo [AVISO] No existe backend\.env - copia .env.example y configura las variables
    echo.
)

:: Iniciar backend
echo [1/2] Iniciando backend (FastAPI - puerto 8002)...
cd /d "%~dp0backend"
start "OrquestadorBots-Backend" cmd /c "python main.py"

:: Esperar a que el backend inicie
timeout /t 3 /nobreak > nul

:: Iniciar frontend (expuesto en todas las interfaces)
echo [2/2] Iniciando frontend (Vite - puerto 5175, host 0.0.0.0)...
cd /d "%~dp0frontend"
start "OrquestadorBots-Frontend" cmd /c "npm run dev -- --host 0.0.0.0 --port 5175"

echo.
echo ============================================
echo  Aplicacion iniciada:
echo    Backend:  http://localhost:8002
echo    Frontend: http://localhost:5175 (o http://<tu-ip>.nip.io:5175)
echo    API docs: http://localhost:8002/docs
echo ============================================
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
