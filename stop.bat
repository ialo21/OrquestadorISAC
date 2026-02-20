@echo off
echo Deteniendo procesos de OrquestadorBots...

taskkill /FI "WINDOWTITLE eq OrquestadorBots-Backend*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq OrquestadorBots-Frontend*" /T /F 2>nul

echo Procesos detenidos.
timeout /t 2 /nobreak > nul
