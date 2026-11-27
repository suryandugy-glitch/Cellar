@echo off
cd /d "%~dp0"
java -jar SpaceFix.jar
if errorlevel 1 (
  echo SpaceFix requires Java 21 or newer. Check your installation with java -version.
  pause
)
