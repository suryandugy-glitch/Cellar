#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
java Build.java package

web=src/main/resources/web
site=build/pages
samples="$site/samples"
mkdir -p "$samples"
cp "$web/app.css" "$web/app.js" "$web/logo.svg" "$site/"
cp deploy/pages/index.html deploy/pages/landing.css deploy/pages/landing.js "$site/"
sed 's/<html /<html data-preview /' "$web/index.html" > "$site/demo.html"

java -jar dist/cellar.jar export-demo --out "$samples/passing.csv"
java -jar dist/cellar.jar export-demo --out "$samples/breaking.csv" --demo-break

java -jar dist/cellar.jar check --config cellar.json \
  --csv "$samples/passing.csv" --format json > "$samples/passing.json"
status=0
java -jar dist/cellar.jar check --config cellar.json \
  --csv "$samples/breaking.csv" --format json > "$samples/breaking.json" || status=$?
if [ "$status" -ne 1 ]; then
  echo "Expected the breaking sample to block release (exit 1), got exit $status." >&2
  exit 1
fi
