#!/bin/sh
set -eu
cd "$(dirname "$0")"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
java -m jdk.compiler/com.sun.tools.javac.Main -source 21 -target 21 -d "$tmp/classes" SpaceFix.java
java -m jdk.compiler/com.sun.tools.javac.Main -source 21 -target 21 -cp "$tmp/classes" -d "$tmp/tests" SpaceFixTest.java
java -cp "$tmp/classes:$tmp/tests" SpaceFixTest "$tmp"
java -m jdk.jartool/sun.tools.jar.Main --create --date=2026-01-01T00:00:00Z --file "$tmp/SpaceFix.jar" --main-class SpaceFix -C "$tmp/classes" .
python3 - "$tmp/SpaceFix.jar" <<'PY'
import pathlib, sys, zipfile
with zipfile.ZipFile("../../deploy/pages/SpaceFix.zip", "w") as archive:
    for path in [pathlib.Path(sys.argv[1]), pathlib.Path("Start-SpaceFix.cmd"), pathlib.Path("README.md")]:
        data = path.read_bytes()
        if path.suffix == ".cmd":
            data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
        archive.writestr(zipfile.ZipInfo(path.name), data, compress_type=zipfile.ZIP_DEFLATED)
PY
