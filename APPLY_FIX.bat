@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ============================================================
echo   ERALASH COMBAT - GHLUM COMBAT ART FIX 29.1
echo ============================================================
echo.
set "PROJECT=%~1"
if "%PROJECT%"=="" set "PROJECT=.."
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js не найден.
  echo Установи Node.js или запусти команду вручную на компьютере с Node.js.
  pause
  exit /b 1
)
node "%~dp0apply-ghlum-combat-art-fix.mjs" "%PROJECT%"
if errorlevel 1 (
  echo.
  echo Исправление не применено. Проверь текст ошибки выше.
  pause
  exit /b 1
)
echo.
echo Готово. Загрузи проект на Vercel/Netlify и нажми Ctrl+Shift+R.
pause
