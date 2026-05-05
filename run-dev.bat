@echo off
setlocal
cd /d "%~dp0"

echo Starting Imagen test/dev version...
echo.

if not exist "node_modules" (
  echo node_modules not found. Installing dependencies first...
  call npm install
  if errorlevel 1 goto failed
)

call npm run tauri:dev
if errorlevel 1 goto failed

exit /b 0

:failed
echo.
echo Dev run failed. Check the error output above.
pause
exit /b 1
