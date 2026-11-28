#!/usr/bin/env sh
# Demonstrate a pass, a blocked release, and the fix without making any changes.
set -eu
cd "$(dirname "$0")"
echo 'STEP 1: Checking a compatible CSV (expected PASS)'
java -jar cellar-guard.jar check --config contracts/example-contract.json --csv samples/passing.csv
echo ''
echo 'STEP 2: Checking a renamed column (expected BLOCK)'
code=0
java -jar cellar-guard.jar check --config contracts/example-contract.json --csv samples/broken.csv || code=$?
if [ "$code" -ne 1 ]; then
  echo "Expected a breaking change (exit 1), but got $code." >&2
  exit 2
fi
echo ''
echo 'STEP 3: The repaired export (expected PASS)'
java -jar cellar-guard.jar check --config contracts/example-contract.json --csv samples/fixed.csv
echo ''
echo 'TO FIX IT YOURSELF: Open samples/broken.csv, rename the first column id to order_id,'
echo 'save a copy, and run the check command again. Read START_HERE.md for details.'
