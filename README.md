<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="Cellar" width="320">
  </picture>
</p>

<p align="center"><strong>Catch the CSV change that would break a customer's import, before you ship it.</strong></p>

---

Cellar checks the CSV your software exports against the columns each customer workflow needs. When a pull request would break one of them, the check fails and names the workflow.

```
FAIL  inventory-report requires order_id
PASS  finance-summary satisfies its declared requirements
```

## The problem

A developer renames `order_id` to `id` in a sales export. The app still produces a valid CSV, so its tests pass. A customer's weekly inventory report still looks for `order_id` and fails on the next import. A second customer's finance report reads only `total_cents` and `currency`, and keeps working.

Cellar tells you which of those two reports breaks, while the change is still a pull request.

## Dashboard (no command line needed)

Double-click **`run.bat`** (Windows) or **`run.sh`** (Mac/Linux), or run `python run.py`. A local page opens in your browser with a sidebar for **Check a CSV**, **Contracts**, **History** and **Help**. Drop in a CSV, click **Run check**, edit and save `cellar.json`, copy or download the report, and switch light/dark theme. It runs only on your computer.

With the package installed you can also run `cellar ui`, and `cellar check --format json` prints machine-readable results.

## Quick start

Requires Python 3.9 or newer and has no dependencies.

```bash
pip install .

# 1. Generate a CSV with your real exporter, using synthetic data
python examples/sales_exporter.py --out build/sales_export.csv

# 2. Check it against the contracts in cellar.json
cellar check --config cellar.json --csv build/sales_export.csv
```

To watch it catch a break, simulate the rename:

```bash
python examples/sales_exporter.py --out build/sales_export.csv --demo-break
cellar check --csv build/sales_export.csv     # exits with code 1
```

## Declare your contracts

One JSON file lists each integration and the columns it requires.

```json
{
  "integrations": [
    { "id": "inventory-report", "required": ["order_id", "sku"] },
    { "id": "finance-summary", "required": ["total_cents", "currency"] }
  ]
}
```

- Every integration needs a unique `id` and at least one required column.
- Names match exactly, including case and spaces.
- Extra and reordered columns pass, which fits importers that read fields by name.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every contract passed |
| `1` | At least one contract failed |
| `2` | Invalid input or configuration, so nothing was verified |

Cellar reads only the header row. Reports are deterministic and never include cell values.

Cellar rejects an empty file, a blank first line, blank or duplicate header names, invalid UTF-8 (a byte order mark is fine), and header rows the CSV parser cannot read. Each error says what to fix.

## Run it on every pull request

`.github/workflows/cellar.yml` generates the CSV through your exporter, runs the check with read-only repository permissions, and shows the result in the job summary:

```yaml
- name: Check integrations
  run: cellar check --config cellar.json --csv build/sales_export.csv --summary
```

Replace the example exporter step with your own, run on synthetic seed data. If fixture generation fails, the job fails. In your repository settings, mark the check as required before merging.

## Planned changes

- Edits or removals of a contract need the owner's review. Set your handle in `.github/CODEOWNERS`.
- For a deliberate rename, keep both columns until the affected importer migrates. Then update the contract and remove the old column.
- Record the migration owner in the pull request. The template has a field for it.

## What a pass means

A pass means the generated header meets the declared requirements. It does not cover value formats, units, malformed data rows, positional imports or production-only export variants. A change in date format or price units can pass a header check and still break an import.

## Develop

```bash
python -m unittest discover -s tests -v
```

## Status

Early prototype. Planned next: advisory mode for first rollout, a shared integration registry across repositories, and an audit trail for approved changes.

## License

MIT
