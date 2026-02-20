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

:: Iniciar frontend
echo [2/2] Iniciando frontend (Vite - puerto 5175)...
cd /d "%~dp0frontend"
start "OrquestadorBots-Frontend" cmd /c "npm run dev"

echo.
echo ============================================
echo  Aplicacion iniciada:
echo    Backend:  http://localhost:8002
echo    Frontend: http://localhost:5175
echo    API docs: http://localhost:8002/docs
echo ============================================
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
