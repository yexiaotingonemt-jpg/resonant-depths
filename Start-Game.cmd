@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:5188"
node serve.mjs
pause
