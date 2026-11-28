# Changelog

## Unreleased — Cellar Guard focus

- Made **Cellar Guard** the only product presented by the Studio site; removed legacy product listings, unrelated product pages, prototype source and associated workflows from this repository.
- Added a Java 21 pull-request CSV compatibility workflow with passing and deliberately breaking synthetic fixtures.
- Added a dedicated [Guard user manual](docs/CELLAR_GUARD_MANUAL.md) and [public manual page](https://cellar-csv.vercel.app/manual.html).
- Updated CLI output branding to Cellar Guard without changing the existing `dist/cellar.jar` command or check exit codes.
- Retained Studio HQ at the primary website root; the Guard demonstration remains at `/guard.html`.

The CI fixture is a demonstration until a consuming application generates its candidate CSV from pull-request code.

## 3.0.0-web.1
- Replaced the Swing desktop UI and loopback API with a browser application served by the same JAR.
- Added accounts (owner, maintainer, viewer), PBKDF2 password hashing, lockout and login throttling.
- Added server-side sessions with CSRF, Origin and Host enforcement and a strict Content-Security-Policy.
- Added AES-256-GCM encrypted storage for users, contract and history; revision-guarded contract edits.
- Added HMAC-chained audit log with `audit-verify`; server refuses to start on a broken chain.
- Server refuses to listen on a network interface without TLS or a trusted TLS proxy.
- Engine, CLI commands and exit codes unchanged. Removed `ui` and `serve` commands.
- Test suite expanded to 73 groups including live attack scenarios against a running server.

## 2.0.0-beta.1, 2026-11-15

### Added

- Java 21 engine, CLI, Swing desktop workspace and authenticated local HTTP API.
- Value rules, row counts, allowed/order rules, contract owners and severity.
- Advisory mode and explicit distinction between passing checks and allowing release.
- Header comparison with integration impact and owner mapping.
- JSON/text/Markdown reports, GitHub summaries and export.
- Local rolling history with contract hashes; atomic writes, workspace file locks and stale-save detection.
- Bound input parsing, strict UTF-8/CSV/JSON validation, origin rejection and API bearer token.
- Built JAR, Java-only offline build/test runner, launchers and cross-platform CI definition.
- HLD, LLD, API, PRD, resources, startup plan, migration, security/operations and pilot templates.

### Changed

- Python runtime, packaging, tests and exporter replaced with Java equivalents.
- Browser dashboard replaced by a native Java Swing app. `ui` no longer starts a web server; `serve` provides the API separately.
- History now persists locally instead of browser-only state.
- Invalid UTF-8 anywhere in a file is rejected; strict CSV quoting and header control-character checks apply.
- JSON error output uses a stable object with `error` and `exitCode`.
- `check` exit 0 can include advisory/warning findings; inspect report fields.

### Retained

Legacy required-column configuration, exact header matching, default tolerance of extra/reordered columns, BOM support, deterministic reports and no CSV cell values in reports. Original MIT license and brand assets retained.

### Known limits

Local beta, not a multi-tenant SaaS. No browser frontend, native Windows installer, auto-update, payment system, GitHub App, role-based access, hosted registry, approval enforcement or immutable audit log. Runtime data is local plaintext. Desktop visual acceptance and native Windows/macOS execution remain release checks outside the headless Linux test environment. Full details in docs/TEST_REPORT.md.
