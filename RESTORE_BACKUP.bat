@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "index.before-ghlum-runtime-lock-29.0.html" (
  echo Резервная копия не найдена.
  pause
  exit /b 1
)
copy /Y "index.before-ghlum-runtime-lock-29.0.html" "index.html" >nul
echo Исходный index.html восстановлен.
pause
