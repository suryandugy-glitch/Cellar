# Cellar Guard 3.1.0

**Catch CSV export changes that would break a customer's import, before you ship.**

This is a standalone **Java 21+ application bundle**, not a native Windows `.exe` installer. The ZIP includes a runnable JAR, Windows/macOS/Linux launchers, three synthetic example CSVs, a customer contract, a beginner's guide and the full technical manual.

## New in 3.1.0

- Check multi-column keys such as order ID plus item ID. Findings identify duplicate keys and missing key values by record number.
- Validate every record’s CSV structure with `validateRows`, including on header-only contracts.
- Export Markdown header comparisons and add them to GitHub Actions job summaries. The local Compare exports page shows possible column renames.

## Start in three steps

1. Download **Cellar-Guard-3.1.0.zip** from Assets and extract it.
2. Install Java 21 or later if it isn't already on your computer.
3. On Windows, double-click `start-guard.bat`; on macOS/Linux, run `sh start-guard.sh`. Open the local address printed in the terminal.

To see **PASS → BLOCK → FIX → PASS**, run `try-demo.bat` (Windows) or `sh try-demo.sh` (macOS/Linux). Follow `START_HERE.md` inside the ZIP to repair the broken CSV yourself.

The checker's exit codes are `0` = allowed, `1` = breaking rule, `2` = unable to check. A passing result covers only the declared rules. The public website is a static demonstration; the downloaded Java program performs real local checks.

The GitHub PR workflow in this repository uses synthetic fixtures until configured to produce and validate your application's actual export. No finished GUI installer, signed binary or hosted customer-data service is claimed.
