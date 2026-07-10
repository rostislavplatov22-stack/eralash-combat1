@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Node.js не найден.
 pause
 exit /b 1
)
node apply-true-motion-33.mjs "%CD%"
pause
