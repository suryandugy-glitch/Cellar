# Cellar regression report

The latest local run used JDK 21: **75 test groups passed, 0 failed** with
`java Build.java test`. The suite is dependency-free and starts a real HTTP
server on a loopback port.

| Area | Coverage |
|---|---|
| CSV and contracts | Header and row rules, parsing edge cases, schema validation, deterministic results, value redaction, and bounds |
| CLI | Release exit codes, output formats, invalid arguments, input-file protection, and demo generation |
| Workspace storage | Encrypted persistence, revisions, stale-save conflicts, history retention, baseline migration, and process locking |
| HTTP API | Access-key enforcement, host and origin checks, request sizes, route behavior, contract restore, activity, and inbox processing |
| Optional AI | Cell-value exclusion, task validation, disabled mode, upstream failures, and bounded provider responses |

These are regression checks, not a load test, fuzzing campaign, independent
penetration test, or security certification. TLS listener and Docker/Caddy
deployment templates were not exercised by this run. Review
[`WEB_SECURITY.md`](WEB_SECURITY.md) for the deployment boundary and
operational precautions.
