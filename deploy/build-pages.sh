#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
java Build.java package

web=src/main/resources/web
site=build/pages
samples="$site/samples"
mkdir -p "$samples"
cp "$web/app.css" "$web/app.js" "$web/logo.svg" "$site/"
cp deploy/pages/*.html deploy/pages/*.css deploy/pages/*.js deploy/pages/*.svg "$site/"
node deploy/catalog.mjs "$site"
# Company homepage at /; preserve the existing CSV product page at /guard.html.
cp "$site/index.html" "$site/guard.html"
cp "$site/studio.html" "$site/index.html"
awk '
  /<html / { sub(/<html /, "<html data-preview ") }
  /<\/head>/ { print "  <link rel=\"stylesheet\" href=\"./neo-bento.css\">" }
  /<body>/ { sub(/<body>/, "<body class=\"cellar-workspace-demo\">") }
  { print }
' "$web/index.html" > "$site/demo.html"

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

# This bundled synthetic export uses plain, comma-separated fields.
# Keep the original order_id and add the replacement id for the migration demo.
awk 'BEGIN { FS = "," } { alias = NR == 1 ? "id" : $1; sub(/,/, "," alias ","); print }' \
  "$samples/passing.csv" > "$samples/fixed.csv"
java -jar dist/cellar.jar check --config cellar.json \
  --csv "$samples/fixed.csv" --format json > "$samples/fixed.json"

node deploy/theme-inject.mjs "$site"
