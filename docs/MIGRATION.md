# Current Cellar setup

This guide reflects the current Java web workspace. Earlier desktop and
`serve`/`ui` command instructions are obsolete.

## Run the workspace

Install Java 21 or newer, then run `run.bat` on Windows or `sh run.sh` on
macOS/Linux. Open the local address printed by the launcher. For a chosen port,
use `java -jar dist/cellar.jar web --port 8766`.

## Use the CLI

```sh
java -jar dist/cellar.jar validate
java -jar dist/cellar.jar export-demo --out build/sales.csv
java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
java -jar dist/cellar.jar diff --baseline build/previous.csv --csv build/current.csv
```

The CLI and workspace share the Java validation engine. Checks return exit 0
when allowed, exit 1 when a release is blocked, and exit 2 for invalid input.
Use synthetic exports while setting up a pilot, then confirm your exporter and
consumer requirements with their owners.

## Existing web deployments

Cellar's web server stores its workspace contract, revisions, run history, and
baseline in the configured data directory. Preserve its original master key
with backups. Local mode binds to loopback and does not require sign-in. A
shared deployment can require a single access key, which grants the same
workspace permissions to everyone who has it. It does not have individual
accounts, role-based access, or tenant isolation.

For shared deployment security and backup guidance, follow
[`WEB_SECURITY.md`](WEB_SECURITY.md). For the latest regression scope, see
[`TEST_REPORT.md`](TEST_REPORT.md).
