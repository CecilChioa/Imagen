@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo Imagen Git Release Helper
echo =========================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found in PATH.
  goto failed
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  goto failed
)

if not exist ".github\workflows\build-release.yml" (
  echo Missing .github\workflows\build-release.yml. Run this script from the imagen project.
  goto failed
)

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw package.json | ConvertFrom-Json).version"`) do set CURRENT_VERSION=%%v
echo Current version: %CURRENT_VERSION%
echo.

set /p RELEASE_VERSION=Enter release version without v prefix ^(press Enter to keep current^): 
if "%RELEASE_VERSION%"=="" set RELEASE_VERSION=%CURRENT_VERSION%
set RELEASE_TAG=v%RELEASE_VERSION%

echo.
echo Release version: %RELEASE_VERSION%
echo Release tag:     %RELEASE_TAG%
echo GitHub Actions:  .github\workflows\build-release.yml triggers on pushed v* tags
echo.

for /f "delims=" %%b in ('git branch --show-current') do set CURRENT_BRANCH=%%b
if "%CURRENT_BRANCH%"=="" (
  echo Could not detect current Git branch.
  goto failed
)
echo Current branch:  %CURRENT_BRANCH%
echo.

git diff --quiet -- package.json package-lock.json src-tauri\tauri.conf.json src-tauri\Cargo.toml
set VERSION_FILES_DIRTY=%ERRORLEVEL%

if not "%RELEASE_VERSION%"=="%CURRENT_VERSION%" (
  echo Updating version files...
  node "scripts\update-version.cjs" "%RELEASE_VERSION%"
  if errorlevel 1 goto failed
  set VERSION_FILES_DIRTY=1
  echo.
)

git rev-parse -q --verify "refs/tags/%RELEASE_TAG%" >nul 2>nul
if not errorlevel 1 (
  echo Tag %RELEASE_TAG% already exists locally.
  goto failed
)

git ls-remote --exit-code --tags origin "refs/tags/%RELEASE_TAG%" >nul 2>nul
if not errorlevel 1 (
  echo Tag %RELEASE_TAG% already exists on origin.
  goto failed
)

echo Pending changes:
git status --short
echo.

if "%VERSION_FILES_DIRTY%"=="1" (
  set /p COMMIT_VERSION=Commit version files now? [Y/n]: 
  if /i not "!COMMIT_VERSION!"=="n" (
    git add package.json package-lock.json src-tauri\tauri.conf.json src-tauri\Cargo.toml
    if errorlevel 1 goto failed
    git commit -m "Release %RELEASE_TAG%"
    if errorlevel 1 goto failed
    echo.
  )
)

git diff --cached --quiet
if errorlevel 1 (
  echo Staged changes detected.
  set /p COMMIT_STAGED=Commit staged changes before creating the release tag? [Y/n]: 
  if /i "!COMMIT_STAGED!"=="n" (
    echo Staged changes must be committed or unstaged before creating the release tag.
    goto failed
  )
  set /p STAGED_COMMIT_MESSAGE=Commit message ^(press Enter for "Release %RELEASE_TAG% updates"^): 
  if "!STAGED_COMMIT_MESSAGE!"=="" set STAGED_COMMIT_MESSAGE=Release %RELEASE_TAG% updates
  git commit -m "!STAGED_COMMIT_MESSAGE!"
  if errorlevel 1 goto failed
  echo.
)

echo Current working tree status:
git status --short
echo.
set /p CONFIRM=Create %RELEASE_TAG%, push %CURRENT_BRANCH%, and push tag to origin? [y/N]: 
if /i not "%CONFIRM%"=="y" (
  echo Cancelled.
  pause
  exit /b 0
)

git tag "%RELEASE_TAG%"
if errorlevel 1 goto failed

git push origin "%CURRENT_BRANCH%"
if errorlevel 1 goto failed

git push origin "%RELEASE_TAG%"
if errorlevel 1 goto failed

echo.
echo Release tag pushed. GitHub Actions should build and publish the release:
echo   %RELEASE_TAG%
echo.
pause
exit /b 0

:failed
echo.
echo Release helper failed. Check the output above.
pause
exit /b 1