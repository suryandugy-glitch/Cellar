# Cellar operations and release runbook

## Product and deployment boundary

Cellar is a Java 21+ application for local CSV contract checks and one shared
workspace per Java server. Local mode binds to loopback and needs no account.
A shared deployment can require one access key; everyone with that key has the
same workspace permissions. Cellar does not currently provide per-user roles,
tenant isolation, hosted account management, or automatic backups. Use a
separate server and data directory for unrelated teams or pilot customers.

Follow [`WEB_SECURITY.md`](WEB_SECURITY.md) for TLS/reverse-proxy setup,
required secrets, and the shared deployment checklist.

## Start and operate

From the repository folder, run `run.bat` on Windows or `sh run.sh` on macOS or
Linux, then open the local address printed by the launcher. The dashboard checks
the server readiness endpoint while it is open. To choose a port explicitly,
run `java -jar dist/cellar.jar web --port 8766`.

The API exposes `/api/health` for process health and `/api/ready` for readiness.
Readiness also checks that the configured data directory is writable. Check
startup logs and free disk space if either endpoint fails.

## Data and recovery

- Contracts, revisions, check history, and the baseline are encrypted in the
  workspace data directory. Preserve the original master key with backups.
- Reports and history retain structural findings and metadata, not raw CSV cell
  values. CSV files placed in the watched inbox remain on disk until the
  operator removes them.
- The activity log records actions and client addresses and is protected by an
  HMAC chain. A local copy of the log cannot detect removal of its newest tail
  unless its last known head was saved separately.
- Cellar does not create backups or guarantee power-loss durability. Stop the
  service before making a consistent backup of the data directory.

To restore, stop the service, restore the data directory and matching master
key, then restart one server process. Verify the log and run a synthetic check:

```sh
java -jar dist/cellar.jar audit-verify --data PATH
java -jar dist/cellar.jar export-demo --out build/sales.csv
java -jar dist/cellar.jar check --csv build/sales.csv --summary
```

## Common problems

| Symptom | Check |
|---|---|
| `java` is not recognized | Install Java 21+, reopen the terminal, and verify `java -version`. |
| Build compiler missing | Install a full JDK; a runtime can launch the JAR but cannot compile the source. |
| Port is already in use | Stop the other process or start Cellar with `web --port 8766`. |
| HTTP 401 | For a shared deployment, use its configured `CELLAR_ACCESS_KEY`; local mode has no sign-in. |
| HTTP 403 | Check the request `Host`, browser origin, HTTPS reverse-proxy settings, and `CELLAR_FRONTEND_ORIGIN`. |
| HTTP 409 | Reload the contract, reconcile the newer revision, and save again. |
| HTTP 413 | Reduce the request size; a CSV is limited to 8 MiB. |
| AI helper unavailable | Check the provider URL, key, model, outbound network, and `Retry-After` on temporary errors. |
| Workspace busy | Another Cellar server holds the data-directory lock; stop it before starting a replacement. |
| Stored-data or audit verification error | Stop writes, preserve a copy for diagnosis, and restore only from a matching trusted backup. |

## Release checks

1. Run `java Build.java test` with JDK 21+.
2. Package with `java Build.java package` and exercise a passing and breaking
   synthetic export, including CLI exit codes 0 and 1.
3. Inspect the GitHub Actions workflow and deployment output; a local pass does
   not mean remote CI or a hosted deployment has completed.
4. Keep customer exports, credentials, and workspace data out of the source
   archive and public CI logs.

The test report describes the latest automated coverage. TLS and hosted
infrastructure still require deployment-specific review and monitoring.
