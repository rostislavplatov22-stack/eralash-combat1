@echo off
chcp 65001 >nul
cd /d "%~dp0"
node apply-hard-combat-31-1.mjs .
pause
