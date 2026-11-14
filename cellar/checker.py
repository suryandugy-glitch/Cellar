"""Core logic: read a CSV header and check it against integration contracts."""

from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Sequence, Tuple


class InputError(Exception):
    """The checker could not run because of invalid input or configuration."""


@dataclass(frozen=True)
class Integration:
    id: str
    required: Tuple[str, ...]


@dataclass(frozen=True)
class Result:
    integration: str
    missing: Tuple[str, ...]

    @property
    def passed(self) -> bool:
        return not self.missing


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

def load_config(path: str) -> List[Integration]:
    """Load and validate the JSON contract file."""
    try:
        text = Path(path).read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        raise InputError(f"Config file not found: {path}. Create it or pass --config.")
    except UnicodeDecodeError:
        raise InputError(f"Config file {path} is not valid UTF-8.")
    except OSError as exc:
        raise InputError(f"Cannot read config file {path}: {exc.strerror or exc}")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InputError(
            f"Config file {path} is not valid JSON (line {exc.lineno}, column {exc.colno}): {exc.msg}."
        )
    return parse_config(data)


def _is_blank(value: Any) -> bool:
    return not isinstance(value, str) or value.strip() == ""


def parse_config(data: Any) -> List[Integration]:
    """Validate parsed JSON and return the integrations in file order."""
    if not isinstance(data, dict) or "integrations" not in data:
        raise InputError('Config must be a JSON object with an "integrations" list.')
    items = data["integrations"]
    if not isinstance(items, list) or not items:
        raise InputError('Config "integrations" must be a list with at least one integration.')

    integrations: List[Integration] = []
    seen_ids = set()
    for index, item in enumerate(items, start=1):
        where = f"integration #{index}"
        if not isinstance(item, dict):
            raise InputError(f'Config {where} must be an object with "id" and "required".')
        if _is_blank(item.get("id")):
            raise InputError(f'Config {where} needs a non-empty string "id".')
        integration_id = item["id"]
        if integration_id in seen_ids:
            raise InputError(f'Config has a duplicate integration id: "{integration_id}". Ids must be unique.')
        seen_ids.add(integration_id)

        required = item.get("required")
        if not isinstance(required, list) or not required:
            raise InputError(f'Config integration "{integration_id}" needs a "required" list with at least one column name.')
        if any(_is_blank(name) for name in required):
            raise InputError(f'Config integration "{integration_id}" has a blank or non-string column name in "required".')
        unique_required = tuple(dict.fromkeys(required))  # drop repeats, keep order
        integrations.append(Integration(id=integration_id, required=unique_required))
    return integrations


# --------------------------------------------------------------------------
# CSV header
# --------------------------------------------------------------------------

def read_header(path: str) -> List[str]:
    """Read and validate the first row of a CSV file. Data rows are never read."""
    try:
        with open(path, "r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            try:
                header = next(reader)
            except StopIteration:
                raise InputError(
                    f"CSV file {path} is empty. Check that the exporter ran and wrote a header row."
                )
    except FileNotFoundError:
        raise InputError(f"CSV file not found: {path}. Check that the exporter wrote it before the check ran.")
    except UnicodeDecodeError:
        raise InputError(f"CSV file {path} is not valid UTF-8. Export the file as UTF-8 (a byte order mark is fine).")
    except csv.Error as exc:
        raise InputError(f"CSV header in {path} could not be parsed: {exc}.")
    except OSError as exc:
        raise InputError(f"Cannot read CSV file {path}: {exc.strerror or exc}")

    return validate_header(header, path)


def validate_header(header: Sequence[str], path: str = "CSV file") -> List[str]:
    if not header:
        raise InputError(f"The first line of {path} is blank. The header row must come first.")
    for position, name in enumerate(header, start=1):
        if name.strip() == "":
            raise InputError(f"{path} has a blank header name in column {position}. Give every column a name.")
    duplicates = sorted({name for name in header if header.count(name) > 1})
    if duplicates:
        listed = ", ".join(duplicates)
        raise InputError(f"{path} has duplicate header names: {listed}. Rename or remove the repeats.")
    return list(header)


# --------------------------------------------------------------------------
# Checking and reporting
# --------------------------------------------------------------------------

def check_header(header: Sequence[str], integrations: Sequence[Integration]) -> List[Result]:
    """Evaluate every integration. Names match exactly (case and spaces count)."""
    present = set(header)
    return [
        Result(
            integration=integration.id,
            missing=tuple(name for name in integration.required if name not in present),
        )
        for integration in integrations
    ]


def format_text(results: Sequence[Result]) -> str:
    lines = []
    for result in results:
        if result.passed:
            lines.append(f"PASS  {result.integration} satisfies its declared requirements")
        else:
            lines.append(f"FAIL  {result.integration} requires {', '.join(result.missing)}")
    return "\n".join(lines)


def _md(text: str) -> str:
    return text.replace("|", "\\|").replace("`", "'")


def format_markdown(results: Sequence[Result]) -> str:
    failed = sum(1 for r in results if not r.passed)
    rows = ["### Cellar: CSV compatibility", "", "| Status | Integration | Details |", "|---|---|---|"]
    for r in results:
        if r.passed:
            rows.append(f"| ✅ PASS | {_md(r.integration)} | All required columns are present |")
        else:
            missing = ", ".join(f"`{_md(name)}`" for name in r.missing)
            rows.append(f"| ❌ FAIL | {_md(r.integration)} | Missing {missing} |")
    rows += [
        "",
        f"{len(results)} integration(s) checked, {failed} failed.",
        "",
        "A pass means the generated header meets the declared requirements. "
        "Value formats, units and data rows are not checked.",
        "",
    ]
    return "\n".join(rows)


def format_error_markdown(message: str) -> str:
    return "\n".join([
        "### Cellar: the check could not run",
        "",
        f"> {_md(message)}",
        "",
        "Nothing was verified. Fix the problem above and run the check again.",
        "",
    ])


def header_from_text(text: str, name: str = "The CSV") -> List[str]:
    """Parse the header row from CSV text (used by the web dashboard)."""
    try:
        header = next(csv.reader(io.StringIO(text.lstrip("\ufeff"), newline="")))
    except StopIteration:
        raise InputError("The CSV is empty. Choose a file or paste a header row.")
    except csv.Error as exc:
        raise InputError(f"CSV header could not be parsed: {exc}.")
    return validate_header(header, name)
