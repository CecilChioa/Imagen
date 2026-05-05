
@echo off
setlocal
cd /d "%~dp0"

echo Building Imagen release EXE...
echo.

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw package.json | ConvertFrom-Json).version"`) do set CURRENT_VERSION=%%v
echo Current version: %CURRENT_VERSION%
set /p APP_VERSION=Enter version for this build ^(press Enter to keep current^): 
if not "%APP_VERSION%"=="" (
  node "scripts\update-version.cjs" "%APP_VERSION%"
  if errorlevel 1 goto failed
  set BUILD_VERSION=%APP_VERSION%
  echo.
)
if "%APP_VERSION%"=="" (
  set BUILD_VERSION=%CURRENT_VERSION%
)

if not exist "node_modules" (
  echo node_modules not found. Installing dependencies first...
  call npm install
  if errorlevel 1 goto failed
)

call npm run tauri:build
if errorlevel 1 goto failed

echo.
echo Build finished.
echo Copying build artifacts before cleanup...
set RELEASE_DIR=dist-release\Imagen-%BUILD_VERSION%
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"
if exist "target\release\imagen.exe" copy /Y "target\release\imagen.exe" "%RELEASE_DIR%\Imagen.exe" >nul
if exist "src-tauri\target\release\imagen.exe" copy /Y "src-tauri\target\release\imagen.exe" "%RELEASE_DIR%\Imagen.exe" >nul
if exist "target\release\bundle" xcopy /E /I /Y "target\release\bundle" "%RELEASE_DIR%\bundle" >nul
if exist "src-tauri\target\release\bundle" xcopy /E /I /Y "src-tauri\target\release\bundle" "%RELEASE_DIR%\bundle" >nul

echo Cleaning Rust build cache...
cargo clean --manifest-path src-tauri\Cargo.toml
powershell -NoProfile -Command "$root=(Resolve-Path '.').Path; foreach ($target in @('target','src-tauri\target')) { $path=Join-Path $root $target; if (Test-Path -LiteralPath $path) { $resolved=(Resolve-Path -LiteralPath $path).Path; if (-not $resolved.StartsWith($root)) { throw \"Refusing to remove outside project: $resolved\" }; Remove-Item -LiteralPath $resolved -Recurse -Force } }"
if errorlevel 1 goto failed

echo.
echo Release files copied to:
echo   %RELEASE_DIR%
echo.
pause
exit /b 0

:failed
echo.
echo Build failed. Check the error output above.
pause
exit /b 1
