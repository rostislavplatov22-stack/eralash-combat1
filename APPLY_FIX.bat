@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ============================================================
echo   ERALASH COMBAT - GHLUM FULL MOTION 30.0
echo ============================================================
echo.
set "PROJECT=%~1"
if "%PROJECT%"=="" set "PROJECT=.."
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js не найден.
  echo Установи Node.js и повтори запуск.
  pause
  exit /b 1
)
node "%~dp0apply-ghlum-full-motion-30.mjs" "%PROJECT%"
if errorlevel 1 (
  echo.
  echo Исправление не применено. Проверь ошибку выше.
  pause
  exit /b 1
)
echo.
echo Готово. Загрузи весь проект и нажми Ctrl+Shift+R.
pause
