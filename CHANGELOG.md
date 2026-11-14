# Changelog

## 0.1.0 - first release

- `cellar check` compares a CSV header with the columns each integration requires.
- Exit codes for CI: 0 pass, 1 contract failed, 2 invalid input or configuration.
- Clear errors for empty files, blank or duplicate headers, invalid UTF-8 and invalid config.
- GitHub Actions workflow with a job summary, read-only permissions and a CODEOWNERS rule for contract edits.
- `--format json` output for scripts.
- Local web dashboard (`cellar ui`, `run.bat`, `run.sh`) with Check, Contracts, History and Help pages.

Known limits: only header names are checked. Value formats, units, data rows, positional imports and production-only export variants are not covered.
