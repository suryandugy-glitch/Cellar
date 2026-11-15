@echo off
setlocal
cd /d "%~dp0"
where java >nul 2>nul
if errorlevel 1 (
  echo Install Java 21 or newer, reopen this window, and try again.
  pause
  exit /b 2
)
if not exist dist\cellar.jar (
  java Build.java package
  if errorlevel 1 ( pause & exit /b 2 )
)
if "%~1"=="" ( java -jar dist\cellar.jar web ) else ( java -jar dist\cellar.jar %* )
set result=%errorlevel%
if not "%result%"=="0" pause
exit /b %result%
