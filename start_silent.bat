@echo off
setlocal

:: Verificar que existe .env en backend
if not exist "%~dp0backend\.env" (
    echo [AVISO] No existe backend\.env - copia .env.example y configura las variables
)

:: ── Backend silencioso via VBScript (ventana oculta, guarda PID) ─────────────
echo Set oShell = CreateObject("WScript.Shell") > "%TEMP%\orq_backend.vbs"
echo Dim oProceso >> "%TEMP%\orq_backend.vbs"
echo oProceso = oShell.Run("cmd /c cd /d ""%~dp0backend"" && python main.py", 0, False) >> "%TEMP%\orq_backend.vbs"
wscript "%TEMP%\orq_backend.vbs"
del "%TEMP%\orq_backend.vbs"

:: Esperar a que el backend inicie y obtener su PID por puerto
timeout /t 4 /nobreak > nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8002 " ^| findstr "LISTENING"') do (
    echo %%P > "%~dp0backend\.pid"
    echo   [backend] PID %%P guardado
)

:: ── Frontend silencioso via VBScript ─────────────────────────────────────────
echo Set oShell = CreateObject("WScript.Shell") > "%TEMP%\orq_frontend.vbs"
echo oShell.Run "cmd /c cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0 --port 5175", 0, False >> "%TEMP%\orq_frontend.vbs"
wscript "%TEMP%\orq_frontend.vbs"
del "%TEMP%\orq_frontend.vbs"

:: Esperar a que el frontend inicie y obtener su PID por puerto
timeout /t 6 /nobreak > nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    echo %%P > "%~dp0frontend\.pid"
    echo   [frontend] PID %%P guardado
)

echo Orquestador iniciado en modo silencioso.
echo   Backend:  http://localhost:8002
echo   Frontend: http://localhost:5175
endlocal
