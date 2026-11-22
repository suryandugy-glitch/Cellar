# Deploy Cellar Web

Cellar supports one shared workspace per Java server. Everyone with the access
key has the same workspace permissions. GitHub Pages hosts sample reports and
documentation. Run the Java server to validate custom exports, edit contracts,
or store history.

## Docker Compose

Use a DNS hostname that resolves to the host running Caddy. Keep TCP ports 80
and 443 available to Caddy and leave the Java container on the internal network.
Provide these values through your deployment environment or secret manager.

| Variable | Value |
|---|---|
| `CELLAR_DOMAIN` | Public hostname, for example `cellar.example.com` |
| `CELLAR_ACCESS_KEY` | Random shared access key (24+ characters). Generate with `openssl rand -base64 24`. |
| `CELLAR_MASTER_KEY` | Persistent encryption and audit key. Generate once with `openssl rand -base64 32`. |

```sh
docker compose -f deploy/docker-compose.yml up -d --build --wait
```

Open the HTTPS site and enter the access key. The Java image runs as a
non-root user with a read-only root filesystem and a writable data volume.
Caddy waits for Java readiness and supplies the forwarded scheme and client
address. The backend workflow tests this stack over HTTPS with synthetic data.

## Run Java directly

`sh run.sh` or `run.bat` starts the local app. With default settings it binds
to loopback, creates its own master-key file and requires no access key.

For a shared deployment, set `CELLAR_PUBLIC_URL` to the HTTPS origin,
`CELLAR_ACCESS_KEY` and `CELLAR_MASTER_KEY` as above, and `CELLAR_DATA` to a
persistent writable directory. When using a reverse proxy, set
`CELLAR_TRUST_PROXY=true`. Keep the Java listener reachable only by the proxy,
including when the bind address is loopback. Configure the proxy to replace
client-supplied forwarded headers and to send `X-Forwarded-Proto: https`.
For direct TLS, set `CELLAR_TLS_KEYSTORE` to a PKCS12 keystore and provide
`CELLAR_TLS_PASSWORD`. Set `CELLAR_BIND` and `CELLAR_PORT` for the listener.

## Connect a separate Vercel frontend

Set `CELLAR_FRONTEND_ORIGIN` on the Java host to the exact HTTPS origin of
the Vercel site. In Vercel, set `CELLAR_WORKSPACE_URL` to the HTTPS Java API
origin. Both values are origins without a path. Java enables API CORS for
that one frontend and requires the existing shared access key and master key.
The workspace link on Vercel opens the live UI and the browser sends requests
directly to Java. The access key is entered by the user and sent in
`X-Access-Key` rather than built into the site.

## Runtime and data behavior

- `/api/health` checks that HTTP is serving. `/api/ready` also checks that
  the server is accepting work and the data directory is writable. Both use
  the configured host and HTTPS forwarding rules.
- The Java server limits worker threads, queued requests, concurrent CSV
  checks and request sizes. The proxy can apply additional traffic controls.
- The web app stores encrypted contracts, revisions, history and the last
  passing header. Reports contain column names, findings and row numbers.
  CSV cell values are excluded. Inbox CSVs remain on disk until the operator
  removes them. Deliver inbox files by atomic rename after writing them.
- Audit entries include action, time, shared actor label and client address.
  The HMAC chain detects changes within the log. Retain a copy of the latest
  audit head separately to detect removal of the newest entries.
- The optional AI helper sends contract and report metadata and the submitted
  question to the configured provider. It is off by default. The supplied
  Compose network isolates the backend from the internet. Configure outbound
  access separately if you intentionally enable the AI provider.

## Backup, upgrade and restore

Use a local filesystem with working file locks. A server holds the workspace
lock until its workers stop. Stop the Java service before taking a consistent
backup, and save the data volume and its original master key separately.
Monitor free disk space, including the append-only audit log. Full power-loss
durability depends on the host filesystem.

Upgrading preserves the existing encrypted contract and revision history.
The first new check carries the previous passing header from `baseline.enc`
into `history.enc`. Before downgrading, restore a matching pre-upgrade backup
to recover the earlier baseline. Existing shared deployments must provide
explicit HTTPS and secret settings before restart. To reuse a generated local
master key for a shared deployment, supply the existing value from
`data/master.key` through the secret manager.

For restore, stop the service, restore the volume and original key, and start
a single Java process. Verify the audit trail using the *Verify integrity*
action or `java -jar dist/cellar.jar audit-verify --data PATH` while the server
is stopped. Run a synthetic check and confirm the expected history.

The workspace writes and activity log are separate files. If a mutation
returns a storage or audit error, check the current revision or history before
retrying. Separate deployments are required for distinct teams or datasets.
