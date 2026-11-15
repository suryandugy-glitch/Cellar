# Cellar Web — security design and operating rules

## Read this first: what "hard to crack" can and cannot mean

No web application is uncrackable, and anyone who tells you otherwise is selling something. Hiding source code is not a defence: Java bytecode can be decompiled, and a determined attacker can probe a live server regardless. Cellar Web follows the opposite principle (Kerckhoffs): **assume the attacker has the full source and the JAR, and make that not matter.** Security comes from design, not secrecy:

1. **Nothing valuable lives in the browser.** The UI (`app.js`, ~15 KB) only draws what the server returns. Validation rules, permissions, contract storage and the audit trail are all server-side. A "vibe coder" who edits the page, replays requests or reads `app.js` gains nothing: every request is re-authenticated, re-authorised and re-validated.
2. **Keep the JAR on your server, not on user machines.** Users receive HTML/JS/CSS only. Protecting the JAR is then a matter of ordinary server access control.
3. **A stolen disk is useless without the key.** Data files are AES-256-GCM encrypted; the master key comes from the environment/secret manager.
4. **Everything fails closed.** Misconfiguration, tampering and audit-write failure stop the operation or the server; they never silently degrade.

If you also want to raise the cost of reverse-engineering a JAR you must distribute, run it through an obfuscator such as ProGuard as a build step. That is a speed bump, not a security control, and it is intentionally not part of this offline, zero-dependency build.

## Threat model and controls

| Threat | Control | Verified by |
|---|---|---|
| Password guessing / credential stuffing | PBKDF2-HMAC-SHA256, 600,000 iterations, per-user salt; 12–128 char policy plus blocklist; per-IP login throttle (8 burst, 6/min); account lockout after 5 failures for 15 min; identical error for unknown user, wrong password and locked account; dummy hash for unknown users so timing does not reveal accounts; hashing concurrency-capped so floods cannot exhaust CPU | `accounts lockout…`, `login throttling…` |
| Session theft / fixation | 256-bit random ids; only SHA-256 of the id is stored server-side; `HttpOnly`, `SameSite=Strict`, `Secure` + `__Host-` prefix on HTTPS; new id at every login; 20 min idle and 8 h absolute expiry; max 5 sessions per user; sessions end on logout, password change, role change and account disable | `sessions hashed…`, `logout and password change…`, `roles…` |
| CSRF | Three independent layers: `SameSite=Strict` cookie, mandatory same-origin `Origin` header plus `Sec-Fetch-Site` check on every state-changing request, and a per-session CSRF token header. JSON-only content type blocks form posts | `CSRF, origin and content-type enforced` |
| XSS | Strict CSP (`default-src 'none'; script-src 'self'; style-src 'self'; frame-ancestors 'none'`, no `unsafe-*`); UI builds DOM from text nodes only; no inline script/style; all responses `nosniff` | `static shell…`; browser run with zero CSP violations and an injected `<img onerror>` rendered inert |
| Broken access control | One central pipeline; each route declares a minimum role (viewer < maintainer < owner); role is looked up on every request, never trusted from the cookie; last active owner cannot be removed | `roles: viewer is read-only…` |
| DNS rebinding / host spoofing | Exact `Host` allow-list | `bad Host header rejected` |
| Data theft from disk or backup | AES-256-GCM at rest, purpose-bound AAD (a file cannot be swapped for another), per-purpose subkeys from the master key, owner-only file permissions, atomic writes | `data directory holds no plaintext…`, `vault encrypts…` |
| Tampering and cover-ups | Append-only audit log; each entry carries an HMAC over its content and the previous entry's HMAC. Edit, delete or reorder a line and verification fails; startup refuses a broken chain; `audit-verify` command and owner UI check it. Audit write failure aborts the operation | `audit chain detects…`, `audit integrity endpoint…` |
| Sensitive data leakage | Reports and history never contain CSV cell values; passwords, tokens and cell values are never logged; errors return a reference id, with detail only in the server log; `/api/health` exposes no version | `check works… never echoes cell values` |
| Resource exhaustion | Per-route body caps (64 KB / 1 MB / 9 MB / 17 MB), 8 MiB / 100k row / 1k column engine limits, concurrent check cap (4), global per-IP rate limit, bounded limiter and session tables, JDK slow-client timeouts | `body size limits` |
| Plaintext exposure | Server refuses to bind a network interface without TLS (own keystore) or a trusted TLS proxy, and requires `CELLAR_PUBLIC_URL`; behind a proxy it rejects requests not marked `X-Forwarded-Proto: https` | `config refuses unsafe exposure` |
| Unauthorised first-run takeover | Owner creation requires a one-time 128-bit code printed only on the server console; unusable after the first owner exists | `first-run setup…`, `setup cannot be replayed` |

## What this does NOT protect against (be honest with customers)

- **Host compromise.** Someone with root on the server can read the master key from the process environment. Use a secret manager, a dedicated host/container and OS hardening.
- **Weak operator practice.** A leaked `CELLAR_MASTER_KEY`, reused passwords or an exposed setup code defeat the controls above.
- **Audit tail truncation.** The chain detects edits and mid-log deletion, but removing the newest entries leaves a valid shorter chain. Record the `head` value (shown by *Verify integrity* / `audit-verify`) somewhere separate, for example in a ticket or Git commit.
- **Lockout abuse.** An attacker who knows a username can lock that account for 15 minutes. An owner can reset it immediately; per-IP throttling limits the rate.
- **Denial of service at scale.** The JDK HTTP server and per-process limits are fine for a team tool, not a defence against a distributed flood. Put a CDN/WAF in front for public exposure.
- **No independent security audit or penetration test has been performed.** The automated suite checks the controls above; it is not a substitute for a review before storing real customer data.
- **Single process, single workspace.** Sessions live in memory (a restart signs everyone out). Contracts are shared by all users of one deployment; true multi-tenant isolation is future work.

## Deployment

### Local (developer machine)
`sh run.sh` (or `run.bat`). Binds to `127.0.0.1:8080`, creates `data/` and `data/master.key` (mode 600). The console prints a one-time setup code; open http://127.0.0.1:8080 and create the owner.

### Server behind a TLS reverse proxy (recommended)
Terminate TLS at Caddy/nginx/a cloud load balancer, and set:

| Variable | Example | Purpose |
|---|---|---|
| `CELLAR_BIND` | `0.0.0.0` (container) or `127.0.0.1` | Interface |
| `CELLAR_PORT` | `8080` | Port |
| `CELLAR_PUBLIC_URL` | `https://cellar.example.com` | Allowed Host/Origin; required off-loopback |
| `CELLAR_TRUST_PROXY` | `true` | Trust one proxy for client IP and `X-Forwarded-Proto: https` (**only** if clients cannot reach Cellar directly) |
| `CELLAR_MASTER_KEY` | `openssl rand -base64 32` | Encryption and audit key; keep in a secret manager; **losing it makes the data unreadable** |
| `CELLAR_DATA` | `/data` | Encrypted data directory (back it up) |
| `CELLAR_IDLE_MINUTES` / `CELLAR_SESSION_HOURS` | `20` / `8` | Session lifetimes |
| `CELLAR_PBKDF2_ITERATIONS` | `600000` | Minimum 100,000 |

The proxy must overwrite, not append to, client-supplied `X-Forwarded-*` headers. `deploy/Caddyfile` and `deploy/docker-compose.yml` show a hardened layout (non-root, read-only filesystem, all capabilities dropped, no published app port). They have not been run in this build environment; test them before relying on them.

### Direct TLS
Set `CELLAR_TLS_KEYSTORE` (PKCS12) and `CELLAR_TLS_PASSWORD`. TLS 1.3/1.2 only. This path has not been exercised by the automated tests.

## Operations checklist
1. Generate the master key once; store it separately from backups of `data/`.
2. Back up `data/` (encrypted already) and test a restore with the same key.
3. Run `java -jar dist/cellar.jar audit-verify` on a schedule; alert on non-zero exit.
4. Review *Team* and *Audit* in the UI monthly; disable leavers.
5. Rotate the master key by deploying a new instance and re-entering contracts/users (automatic re-encryption is not implemented).
6. Keep Java patched; rebuild with `java Build.java test`.
