# Operations, security and release runbook

> **Note (3.0.0-web.1):** this document describes the 2.0 desktop/loopback design. The product is now a hardened web application; see `README.md` and `docs/WEB_SECURITY.md`. The validation engine described here is unchanged.


## Supported deployment boundary

This beta is a single-user local/CI application. The HTTP API is loopback-only and authenticated. It has no public TLS endpoint, remote accounts or tenant isolation. Keep it local. Use separate workspace directories for unrelated pilot customers and restrict OS access to those directories.

## Data inventory

| Item | Location | Sensitivity / retention |
|---|---|---|
| Contracts | `cellar.json` or `--config` | Consumer names, owners and requirements; keep in controlled Git history |
| CSV input | User-selected path / memory | Potential customer records; use synthetic fixtures; app does not retain a copy |
| Check summaries | `.cellar/history.json` or `--data` | Integration IDs, timestamps, counts and hash; rolling latest 100 |
| Reports | Explicit CLI/UI export path, job summary | Header names, owners, findings and record numbers; no cell values |
| API token | Environment or startup console | Secret; per-process random default; never commit/share |
| Workspace lock | `.cellar/workspace.lock` | Coordination file; existence alone does not mean lock is held |

History is editable plaintext, not immutable audit evidence. Avoid sensitive metadata in public CI logs. No telemetry, analytics, error-reporting service or outbound integrations are included.

## Backup and restore

1. Close the desktop/stop API before a full workspace backup.
2. Back up the contract and any needed reports/history to an access-controlled separate location.
3. Keep synthetic fixtures and reviewed contract revisions in Git. Exclude raw production CSVs and secrets.
4. For restore, stop writers, restore known-good files, run `validate`, then check a known synthetic fixture.
5. Confirm history is readable with `history`. If corrupt, preserve a backup for diagnosis before removing or replacing the history file.

The app does not make automatic backups or guarantee crash durability. A rolling 100-run history can lose older entries as designed. File replacement is atomic where the filesystem supports it, but no fsync/power-loss guarantee is made. Test restore before a real pilot depends on stored state.

## Common problems

| Symptom | Action |
|---|---|
| Java not found | Install compatible JDK/runtime, reopen terminal, verify `java -version` |
| Unsupported class version | JAR needs Java 21+; check which `java` is on PATH |
| Build compiler missing | Install a full JDK; running a JAR and building source have different requirements |
| No desktop display | Use CLI/API; Swing needs a graphical session |
| Config missing | Run from project folder, pass `--config`, or use `init` in a new workspace |
| Stale save | Reload config, reconcile changes, retry with fresh revision |
| Workspace busy | Wait for the other operation to finish and retry; use consistent config/data paths |
| API port unavailable | Stop old server or use `serve --port 8766` |
| API 401 | Use the current token with exact Bearer syntax; default rotates on restart |
| API 403 | Use a local CLI client, correct Host, no Origin header |
| Invalid UTF-8 | Export UTF-8; a leading UTF-8 BOM is accepted |
| Wrong row width | Check delimiter, quoting and field count; multiline quoted records are supported |
| Unexpected pass | Inspect scope, advisory and rules; header-only checks do not validate rows |
| History corrupt | Preserve the file, restore backup or intentionally reset it; app will not overwrite corrupt history |

## Threat model

| Threat | Current mitigation | Residual limitation |
|---|---|---|
| Malicious/accidental malformed CSV | Strict parser and size/row/column/field caps | Independent fuzzing still needed |
| Browser page targeting localhost | Bearer token, Host validation, Origin rejection, no CORS | Local malware with OS access can still read files/token |
| Accidental lost contract edits | Revision check, app file lock, temp write/replace | External editors/different data locks can race |
| Cell-value disclosure through reports | Values omitted; generic parser/type errors | Users can put sensitive text in header/contract names |
| Resource exhaustion | Bounded input, issue caps, fixed API workers and concurrent handler cap | Stalled HTTP bodies and expensive rule combinations remain; local trusted use only |
| Supply chain changes | No third-party runtime dependencies; source and tests included | JDK and CI actions still require maintenance/review |
| False confidence | Scope, gate fields, documentation and synthetic-fixture requirements | Undeclared requirements/production variants remain uncovered |

No security audit or penetration-test certification is claimed.

## Release process

1. Review source/contract changes; update version, changelog and migration notes.
2. Run `java Build.java test` from a clean working folder.
3. Run the documented passing and breaking examples using the packaged JAR, verify 0/1/2 exit codes.
4. Run platform CI and manually test Swing on Windows/macOS/Linux with normal and high-DPI displays.
5. Check file chooser, drag/drop, edit/save/reload conflict, advisory, theme, export, diff and restart history.
6. Exercise bounds and representative large fixtures; inspect memory and throughput.
7. Confirm no customer data, credentials or `.cellar` state entered the release archive.
8. Package source, tested JAR, examples, docs, license and launchers; publish a SHA-256 checksum.
9. Mark beta limitations, gather pilot feedback, keep prior tested release available for rollback.

The provided GitHub workflow is not evidence that remote CI has run. Users must push the repository, inspect the jobs, then configure required checks/owner review.

## Public cloud launch prerequisites — future

Before changing the loopback boundary: reviewed authentication and tenant authorization, TLS, request deadlines, rate/resource isolation, secrets management, verified webhooks, database migrations/backups/restore, audit identity, retention/deletion controls, incident ownership, operational monitoring and customer support policy. Perform a threat review and explicit cross-tenant tests. Do not treat a public port binding as a cloud migration.

## Scaling after pilots

Use measurements to determine whether CPU, parsing memory, storage or human onboarding is the bottleneck. Stream large CSVs before raising current limits. Consider a maintained CSV/JSON library after comparative compatibility tests and dependency review. Introduce a database for shared state, then separate validation workers only if concurrency requires it. Keep deterministic checking independent of hosted accounts and billing.
