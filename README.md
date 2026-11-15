<p align="center"><img src="assets/logo.svg" alt="Cellar" width="280"></p>

# Cellar Web — Secure Java CSV Compatibility Platform

**Catch the CSV change that breaks a customer's import before it ships — now as a hardened, server-side web application.**

Version **3.0.0-web.1** converts the Swing desktop app into a browser-based application. The validation engine is unchanged (same rules, same exit codes, same reports). What is new is everything around it: accounts and roles, encrypted storage, a tamper-evident audit log and a strict-CSP web UI, all in Java 21 with **no third-party libraries**.

**Design stance:** assume attackers have the source and the JAR. The browser gets only a thin UI; every decision, rule and permission lives on the server. Read [docs/WEB_SECURITY.md](docs/WEB_SECURITY.md), including its *what this does NOT protect against* section, before putting real data in it. No independent security audit has been done.

## Start (local)

```sh
sh run.sh            # Windows: run.bat   (needs JDK 21+)
```

Open `http://127.0.0.1:8080`. **No account or sign-in on localhost.** Click *Try the breaking demo*: only `inventory-report` fails, and the Triage agent notices `order_id` was probably renamed to `id`.

**Repository:** https://github.com/suryandugy-glitch/Cellar · In-app docs: open the *Docs* page (or press `Ctrl K` and search).

**Live inbox:** drop a `.csv` into `data/inbox/` (or `CELLAR_INBOX`) and it is checked automatically. A *Drift watch* agent compares each export with the last passing one.

**Automatic agents** (offline, rule-based, no model or network): *Triage* (rename detection), *Release gate* (ship or block) and *Reporter* (PR comment) run on every check; *Scout* drafts a contract from a sample CSV. Press `Ctrl K` for the command palette.

**Sharing it on a server:** set `CELLAR_BIND`, `CELLAR_PUBLIC_URL` and one shared `CELLAR_ACCESS_KEY` (12+ characters), and put it behind HTTPS. There are no users, roles or passwords.

## What changed from 2.0.0-beta.1

| Area | 2.0 | 3.0 web |
|---|---|---|
| Interface | Swing desktop | Browser UI served by the same JAR (no Node, no CDN) |
| Access | Single local user, loopback bearer token | Accounts, roles, sessions, CSRF protection |
| Storage | Plain JSON files | AES-256-GCM encrypted at rest, revision-guarded contracts |
| Audit | Editable local history | HMAC-chained audit log, `audit-verify` command |
| Exposure | Loopback only | Refuses plaintext network exposure; TLS direct or via proxy |
| Engine, CLI, GitHub Action | — | **Unchanged** (CLI still the CI gate) |

## Build and test

```sh
java Build.java test      # compiles, runs 73 test groups (engine + web security), packages dist/cellar.jar
java -jar dist/cellar.jar --version
```

No Maven/Gradle or downloads are needed. The suite starts a real server and attacks it: forged cookies, missing CSRF, cross-origin posts, role escalation, oversize bodies, tampered files, tampered audit chain, brute force.

## CLI (unchanged, for CI)

```sh
java -jar dist/cellar.jar export-demo --out build/sales.csv
java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
java -jar dist/cellar.jar audit-verify          # web audit chain; needs CELLAR_MASTER_KEY or data/master.key
```

Check exit codes: `0` allowed, `1` blocked, `2` invalid input or configuration. Contract format: [docs/CONTRACTS.md](docs/CONTRACTS.md).

## Deploy on a server

Terminate TLS in a reverse proxy (see `deploy/`), then set `CELLAR_PUBLIC_URL`, `CELLAR_TRUST_PROXY=true`, `CELLAR_MASTER_KEY` and `CELLAR_DATA`. The server refuses to listen on a network interface without TLS. Details and the full variable table: [docs/WEB_SECURITY.md](docs/WEB_SECURITY.md). Routes: [docs/API.md](docs/API.md).

## Status and honest limits

Working beta for pilots. Single process and single shared workspace; sessions are in memory; no API tokens for machine clients, SSO, MFA, billing or GitHub App yet. Documents `HLD.md`, `LLD.md`, `OPERATIONS.md` describe the 2.0 desktop design and carry a banner; `WEB_SECURITY.md` is authoritative for 3.0.

## Roadmap (smallest steps toward the startup plan)

1. TOTP multi-factor for owners and maintainers.
2. Scoped API tokens so CI can post fixtures without a browser session.
3. Per-repository workspaces (tenant isolation) once a second pilot team needs it.
4. External audit-head anchoring and key-rotation tooling.
