@echo off
setlocal
cd /d "%~dp0"
echo STEP 1: Checking a compatible CSV (expected PASS)
java -jar cellar-guard.jar check --config contracts\example-contract.json --csv samples\passing.csv
if errorlevel 1 goto error
echo.
echo STEP 2: Checking a renamed column (expected BLOCK)
java -jar cellar-guard.jar check --config contracts\example-contract.json --csv samples\broken.csv
if errorlevel 2 goto error
if not errorlevel 1 (
  echo ERROR: The broken file was not blocked.
  goto error
)
echo.
echo STEP 3: The repaired export (expected PASS)
java -jar cellar-guard.jar check --config contracts\example-contract.json --csv samples\fixed.csv
if errorlevel 1 goto error
echo.
echo TO FIX IT YOURSELF: Open samples\broken.csv and change the first header id to order_id.
echo Save a copy, then run the check command again. Read START_HERE.md for details.
pause
exit /b 0
:error
echo The demo could not complete. Check that Java 21 or newer is installed.
pause
exit /b 2
