#!/usr/bin/env sh
# Start the local Cellar Guard workspace from the downloaded release.
set -eu
cd "$(dirname "$0")"
if ! command -v java >/dev/null 2>&1; then
  echo 'Java 21 or newer is required. Install Java, reopen your terminal and retry.' >&2
  exit 2
fi
exec java -jar cellar-guard.jar web
