@echo off
echo Deteniendo OrquestadorBots...

:: ── Matar por PID guardado (start_silent.bat) ────────────────────────────────
if exist "%~dp0backend\.pid" (
    set /p BACKEND_PID=<"%~dp0backend\.pid"
    if defined BACKEND_PID (
        taskkill /PID %BACKEND_PID% /T /F >nul 2>&1
        del "%~dp0backend\.pid" >nul 2>&1
        echo   [OK] Backend detenido (PID %BACKEND_PID%)
    )
)

if exist "%~dp0frontend\.pid" (
    set /p FRONTEND_PID=<"%~dp0frontend\.pid"
    if defined FRONTEND_PID (
        taskkill /PID %FRONTEND_PID% /T /F >nul 2>&1
        del "%~dp0frontend\.pid" >nul 2>&1
        echo   [OK] Frontend detenido (PID %FRONTEND_PID%)
    )
)

:: ── Fallback: matar por titulo de ventana (start.bat normal) ─────────────────
taskkill /FI "WINDOWTITLE eq OrquestadorBots-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq OrquestadorBots-Frontend*" /T /F >nul 2>&1

:: ── Fallback final: matar por puerto ─────────────────────────────────────────
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8002 " ^| findstr "LISTENING"') do (
    taskkill /PID %%P /T /F >nul 2>&1
    echo   [OK] Proceso en puerto 8002 detenido (PID %%P)
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    taskkill /PID %%P /T /F >nul 2>&1
    echo   [OK] Proceso en puerto 5175 detenido (PID %%P)
)

echo Listo.
timeout /t 1 /nobreak > nul
