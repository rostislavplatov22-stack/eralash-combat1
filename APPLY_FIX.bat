@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo  ERALASH COMBAT - GHLUM RUNTIME LOCK 29.0
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: Node.js не найден.
  echo Установите Node.js или поместите эту папку в корень проекта,
  echo где уже используется Node.js.
  pause
  exit /b 1
)
node apply-ghlum-fix.mjs "%~dp0"
if errorlevel 1 (
  echo.
  echo Исправление не применено. Прочитайте ошибку выше.
  pause
  exit /b 1
)
echo.
echo ГОТОВО. index.html исправлен, резервная копия создана.
pause
