#!/usr/bin/env sh
# Starts Cellar Web. Local use: binds to 127.0.0.1 only. For servers, see docs/WEB_SECURITY.md.
set -eu
cd "$(dirname "$0")"
if ! command -v java >/dev/null 2>&1; then echo 'Install Java 21 or newer, then try again.' >&2; exit 2; fi
if [ ! -f dist/cellar.jar ]; then java Build.java package; fi
if [ "$#" -eq 0 ]; then set -- web; fi
exec java -jar dist/cellar.jar "$@"
