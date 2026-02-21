@echo off
setlocal

:: Verificar que existe .env en backend
if not exist "%~dp0backend\.env" (
    echo [AVISO] No existe backend\.env - copia .env.example y configura las variables
)

:: Iniciar backend en segundo plano sin ventana visible
start "" /B pythonw -c "import subprocess,sys,os; os.chdir(r'%~dp0backend'); subprocess.Popen(['python','main.py'],creationflags=0x08000000)" >nul 2>&1

:: Si pythonw no funciona, usar VBScript para lanzar sin ventana
if errorlevel 1 (
    echo Set oShell = CreateObject("WScript.Shell") > "%TEMP%\run_backend.vbs"
    echo oShell.Run "cmd /c cd /d ""%~dp0backend"" && python main.py", 0, False >> "%TEMP%\run_backend.vbs"
    wscript "%TEMP%\run_backend.vbs"
    del "%TEMP%\run_backend.vbs"
)

:: Esperar a que el backend inicie
timeout /t 3 /nobreak > nul

:: Iniciar frontend en segundo plano sin ventana visible
echo Set oShell = CreateObject("WScript.Shell") > "%TEMP%\run_frontend.vbs"
echo oShell.Run "cmd /c cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0 --port 5175", 0, False >> "%TEMP%\run_frontend.vbs"
wscript "%TEMP%\run_frontend.vbs"
del "%TEMP%\run_frontend.vbs"

endlocal
