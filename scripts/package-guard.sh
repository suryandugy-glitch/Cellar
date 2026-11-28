#!/usr/bin/env bash
# Checked Java release bundle for users (no source build required).
set -euo pipefail
cd "$(dirname "$0")/.."

java Build.java package
version="$(java -jar dist/cellar.jar --version)"
version="${version#Cellar Guard }"
bundle="Cellar-Guard-${version}"

stage_root="$(mktemp -d)"
trap 'if [[ -n "${stage_root:-}" && -d "$stage_root" ]]; then rm -r -- "$stage_root"; fi' EXIT
stage="$stage_root/$bundle"
mkdir -p "$stage/contracts" "$stage/samples" "$stage/docs"

cp dist/cellar.jar "$stage/cellar-guard.jar"
cp LICENSE "$stage/LICENSE"
cp README.md "$stage/README.md"
cp CONTRIBUTING.md "$stage/CONTRIBUTING.md"
cp docs/GUARD_START_HERE.md "$stage/START_HERE.md"
cp docs/CELLAR_GUARD_MANUAL.md docs/CONTRACTS.md docs/API.md docs/WEB_SECURITY.md docs/OPERATIONS.md "$stage/docs/"
cp cellar.json "$stage/contracts/example-contract.json"
cp examples/sales.csv "$stage/samples/passing.csv"
cp examples/breaking-header.csv "$stage/samples/broken.csv"
cp examples/sales.csv "$stage/samples/fixed.csv"
cp release/start-guard.sh release/start-guard.bat release/try-demo.sh release/try-demo.bat "$stage/"
chmod +x "$stage/start-guard.sh" "$stage/try-demo.sh"

# Verify the exact JAR, contract and CSV files we are about to publish.
java -jar "$stage/cellar-guard.jar" validate --config "$stage/contracts/example-contract.json"
java -jar "$stage/cellar-guard.jar" check --config "$stage/contracts/example-contract.json" --csv "$stage/samples/passing.csv"
status=0
java -jar "$stage/cellar-guard.jar" check --config "$stage/contracts/example-contract.json" --csv "$stage/samples/broken.csv" || status=$?
if [[ "$status" -ne 1 ]]; then
  echo "Expected broken sample to block (exit 1); got $status" >&2
  exit 1
fi
java -jar "$stage/cellar-guard.jar" check --config "$stage/contracts/example-contract.json" --csv "$stage/samples/fixed.csv"

(cd "$stage_root" && zip -q -r "$bundle.zip" "$bundle")
mv "$stage_root/$bundle.zip" "dist/$bundle.zip"
(cd dist && sha256sum "$bundle.zip" > SHA256SUMS.txt)
echo "Created dist/$bundle.zip with verified PASS/BLOCK/PASS fixtures and SHA256SUMS.txt"
