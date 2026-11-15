# Python to Java migration

This release is a replacement implementation, not a Python wrapper. Python package files, Python tests/exporter, HTML/JavaScript browser UI and old setup scripts are not included in the Java archive. Original MIT notices and logo assets remain.

## Command mapping

| Previous command / feature | Java replacement |
|---|---|
| `python run.py` | `java -jar dist/cellar.jar ui` or double-click run.bat |
| `pip install .` | No install step; use included JAR |
| `cellar check --csv file.csv` | `java -jar dist/cellar.jar check --csv file.csv` |
| `cellar check --format json` | Same flags after Java command; add required --csv |
| `cellar check --summary` | Same flag; appends to GITHUB_STEP_SUMMARY |
| `cellar ui` browser | `ui` native Java Swing dashboard |
| Local Python HTTP endpoints | `serve` Java authenticated `/api/*`; API changed |
| `python examples/sales_exporter.py --out file.csv` | `export-demo --out file.csv` |
| Python unittest | `java Build.java test` |
| Browser history | New local `.cellar/history.json`; old browser history is not imported |

## Compatibility retained

Legacy JSON integration IDs/required-column lists work without conversion. Exact case/space matching remains. Extra and reordered columns pass unless explicitly restricted. Required list duplicates are deduplicated. BOM accepted. Text/JSON result content omits CSV cell values. Blocking check failures exit 1, invalid inputs exit 2.

## Deliberate differences

- UI is now native Java. Browser URL/theme storage and old `ui --port/--no-browser` flags do not apply. Use `serve --port` for local automation.
- HTTP is authenticated and rejects browser-origin requests. Config saving requires an observed revision.
- Check JSON now includes richer scope, gate, hash and issue metadata; update integrations consuming the previous shape.
- Header-only mode still skips data-row parsing, but UTF-8 decoding covers the full bounded file.
- CSV grammar is strict: malformed quoting is rejected. Header controls (including newline) are rejected even inside quotes.
- Unknown config fields are rejected. Fix misspellings instead of silently ignoring them.
- Warning severity/advisory can return 0 while `passed=false`; use `blocking` for the gate.
- New example `cellar.json` includes row rules; use `examples/legacy-contract.json` for old behavior.
- History stores summaries, not full previous reports or source CSVs. Theme selection is session-local, not persisted.

## Rollout checklist

1. Keep a backup of your current config and the original project release.
2. Extract the Java release into a new directory.
3. Copy your contract to a chosen path; run `validate --config PATH`.
4. Compare passing/failing synthetic fixtures with your previous expected outcomes.
5. Replace Python installation/check commands in CI with the Java build/JAR commands.
6. Use advisory mode for an agreed observation period, review findings and revise real requirements.
7. Make blocking checks required only with pilot-owner acceptance.
8. Keep contracts in Git and assign owner reviews to edits/removals.

For a planned rename, publish old and new columns temporarily, migrate consumers, obtain owner confirmation, then change contracts and remove the old column. Cellar reports impact; it does not automatically migrate data or approve breaking changes.
