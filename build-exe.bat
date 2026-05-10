
@echo off
setlocal
cd /d "%~dp0"

set LOCAL_TARGET=windows-amd64

echo Building Imagen local Windows artifacts...
echo Target: %LOCAL_TARGET%
echo.

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw package.json | ConvertFrom-Json).version"`) do set CURRENT_VERSION=%%v
echo Current version: %CURRENT_VERSION%
set /p APP_VERSION=Enter version for this local build ^(press Enter to keep current^): 
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

call npm run build:matrix -- --target=%LOCAL_TARGET%
if errorlevel 1 goto failed

echo.
echo Local Windows release files are under:
echo   dist-release\%BUILD_VERSION%\%LOCAL_TARGET%\
echo.
echo Cleaning Rust build cache...
cargo clean --manifest-path src-tauri\Cargo.toml
powershell -NoProfile -Command "$root=(Resolve-Path '.').Path; foreach ($target in @('target','src-tauri\target')) { $path=Join-Path $root $target; if (Test-Path -LiteralPath $path) { $resolved=(Resolve-Path -LiteralPath $path).Path; if (-not $resolved.StartsWith($root)) { throw \"Refusing to remove outside project: $resolved\" }; Remove-Item -LiteralPath $resolved -Recurse -Force } }"
if errorlevel 1 goto failed

echo.
pause
exit /b 0

:failed
echo.
echo Local Windows build failed. Check the error output above.
pause
exit /b 1
