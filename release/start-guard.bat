@echo off
setlocal
cd /d "%~dp0"
where java >nul 2>nul
if errorlevel 1 (
  echo Java 21 or newer is required. Install Java and reopen this window.
  pause
  exit /b 2
)
echo Starting Cellar Guard. Open the local address printed below in your browser.
java -jar cellar-guard.jar web
if errorlevel 1 pause
