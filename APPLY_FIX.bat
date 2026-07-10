@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js не найден. Установи Node.js или запусти APPLY_FIX.sh.
  pause
  exit /b 1
)
node apply-premium-fight-31.mjs "%CD%"
echo.
pause
