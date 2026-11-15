# Test report — 3.0.0-web.1

Run with `java Build.java test` on OpenJDK 21. Result: **73 test groups passed, 0 failed** (full list in `test-results.txt`). The suite is dependency-free and starts a real HTTP server on an ephemeral port.

| Area | Groups | What is attacked or verified |
|---|---|---|
| Validation engine and CLI (unchanged from 2.0) | 49 | Header and row rules, parsers and bounds, exit codes, report redaction |
| Cryptography | 3 | AES-GCM round trip, tamper and wrong-key/wrong-file rejection, PBKDF2 hashing and password policy |
| Accounts, sessions, rate limiting | 3 | Lockout, uniform failure, restart persistence, last-owner protection; hashed, expiring, revocable sessions with per-user cap; bounded limiter |
| Audit chain | 1 | Edit, deletion and forgery under another key detected; server refuses to start on a broken chain |
| Storage | 1 | Ciphertext only on disk; tampered file fails closed |
| Configuration | 1 | Refuses plaintext network exposure and malformed settings |
| Live server attacks | 15 | Forged cookie, missing/wrong CSRF, cross-origin and no-Origin posts, wrong content type, bad Host, role escalation, disabled-user session kill, password-change revocation, oversize bodies, path probing, first-run replay, login throttling, secret/cell-value/stack-trace leakage, no plaintext in data files, audit tamper detection |

Also performed manually in headless Chromium against the packaged JAR: sign-in, check, contracts, team, audit-verify and sign-out ran with **zero CSP violations or console errors**, and an `<img onerror>` payload in CSV headers rendered as inert text.

## Not covered
TLS listener (`CELLAR_TLS_KEYSTORE`) and the `deploy/` Docker/Caddy templates were not executed. There was no load test, fuzzing campaign, dependency scan (there are no dependencies) or independent penetration test. Treat results as regression evidence, not a security certification.
