@echo off
rem Doppio clic per installare (la prima volta) e avviare LibrAIo su Windows.
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Installa la versione LTS da https://nodejs.org e riprova.
  pause
  exit /b 1
)

call npm install || goto :errore
call npm run build || goto :errore
start "" "http://localhost:3000"
call npm start
pause
exit /b 0

:errore
echo Si e' verificato un errore durante l'installazione.
pause
exit /b 1
