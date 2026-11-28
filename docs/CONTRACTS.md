# Contract reference — version 2

Contracts are UTF-8 JSON. Unknown properties and duplicate JSON keys are rejected so typos do not silently disable rules. Root `version` may be omitted for legacy contracts or set to `2`.

```json
{
  "version": 2,
  "delimiter": ",",
  "integrations": [
    {
      "id": "finance-import",
      "owner": "Finance operations",
      "description": "Monthly invoice ingestion",
      "severity": "error",
      "required": ["invoice_id", "amount", "currency", "issued_on"],
      "allowed": ["invoice_id", "amount", "currency", "issued_on"],
      "order": ["invoice_id", "amount", "currency", "issued_on"],
      "minRows": 1,
      "maxRows": 10000,
      "rules": {
        "invoice_id": {"notEmpty": true, "unique": true},
        "amount": {"type": "decimal", "notEmpty": true, "min": 0, "max": 1000000},
        "currency": {"notEmpty": true, "enum": ["INR", "USD", "EUR"]},
        "issued_on": {"type": "date", "notEmpty": true}
      }
    }
  ]
}
```

Omit `allowed` to permit extra columns. Omit `order` to permit any order. An `order` list is the **entire exact header**, not a relative-order hint. Both lists must contain all required columns. Rule columns must also be required. Duplicate strings in lists are deduplicated in first-seen order for compatibility with v1.

| Field | Default / constraint |
|---|---|
| `delimiter` | `,`; also accepts `;` or JSON `"\t"` |
| `validateRows` | Optional root boolean, default `false`. Set `true` to check CSV structure across all rows, even with header-only rules |
| `integrations` | Required; 1–100 objects, unique IDs |
| `id` | Required nonblank name, max 256 characters, no control characters |
| `required` | Required 1–1,000 nonblank column strings, exact matching |
| `owner` | `Unassigned`; string up to 1,000 characters |
| `description` | Empty string; up to 1,000 characters; context for editors, not a validation rule |
| `severity` | `error` or `warning`; default `error` |
| `allowed`, `order` | Optional nonempty lists |
| `minRows`, `maxRows` | Optional integers 0–100,000; min cannot exceed max |
| `rules` | Optional map keyed by required column name |
| `uniqueKeys` | Optional 1–16 groups per integration, each with 2–16 distinct required columns |

## Value semantics

| Rule | Exact behavior |
|---|---|
| `type: string` | Default; any nonempty string |
| `type: integer` | Base-10 digits with optional minus, no plus, whitespace, exponent or leading zero except `0` / `-0`; max 128 characters |
| `type: decimal` | Integer format plus optional dot and at least one fractional digit; no exponent; max 128 characters |
| `type: boolean` | Exactly `true` or `false` |
| `type: date` | Strict real calendar date `YYYY-MM-DD` |
| `type: datetime` | Java `OffsetDateTime.parse`: ISO date-time with offset or `Z`; timezone-free local timestamps fail |
| `notEmpty` | Rejects exactly empty string; whitespace is not trimmed and counts as present |
| `unique` | Exact, case-sensitive nonempty strings must be unique within this file/column/integration |
| `enum` | Nonempty list of permitted nonblank strings, exact matching |
| `min`, `max` | Inclusive JSON numeric bounds, only for integer or decimal; compared with BigDecimal |

Empty fields skip type/enum/range/unique checks unless `notEmpty` is true. Use `notEmpty` alongside any rule when blanks must fail. Whitespace is significant. Repeated empty cells do not violate uniqueness. Values are not normalized, rounded or rewritten. Range checks run only after the type passes. A failed type prevents an additional enum/range finding for the same cell. Separate rule failures can produce multiple issues per record.

For a combined key, add `"uniqueKeys": [["order_id", "item_id"]]` to an integration that requires both fields. Each complete tuple must be unique within that file. Individual values may repeat in different tuples. Comparisons are exact and case-sensitive. A tuple with an empty field produces `EMPTY_KEY` and is skipped for duplicate detection. Later occurrences of a complete tuple produce `DUPLICATE_KEY`. If a key header is missing, the corresponding `MISSING_COLUMN` finding covers it.

When any integration has value rules, row limits, or combined keys, the whole file is parsed and every record must match header width. With `validateRows: true`, a header-only contract also performs this structural validation and reports `scope=headers-and-row-structure`. Malformed row structure is an input error. A blank data record is one empty field: invalid width for multiple columns, otherwise handled by declared rules. Records may contain quoted newlines; issue `record` is the logical CSV record number (header=1), not a physical line. Row-count issues use record=0. Header-only mode stops CSV parsing after the header but still decodes the entire file as UTF-8.

## Finding codes

`MISSING_COLUMN`, `UNEXPECTED_COLUMN`, `COLUMN_ORDER`, `MIN_ROWS`, `MAX_ROWS`, `EMPTY_VALUE`, `DUPLICATE_VALUE`, `EMPTY_KEY`, `DUPLICATE_KEY`, `INVALID_TYPE`, `ENUM_VALUE`, `BELOW_MIN`, `ABOVE_MAX`.

The report gives column names and logical record numbers, never cell values. Each integration retains at most 200 findings; `issueCount` is the complete count and `truncated=true` indicates omitted details. All integrations are evaluated in configuration order.

## Gate policy

- `passed` is true only if every integration has zero findings, including warnings.
- `blocking` is true only if an error-severity integration fails and advisory is false.
- Advisory/warnings never convert malformed CSV/configuration into success.
- `rowsChecked=0` with `scope=headers-only` means rows were not checked; it does not mean the file has no rows.
- `contractHash` hashes the parsed configuration's compact JSON in insertion order. Reformatting whitespace does not change it; reordering keys can. It is traceability metadata, not a signature.

No regular expressions, arbitrary scripts, cross-file joins, currency conversions, automatic column renames or inferred business meanings are implemented.
