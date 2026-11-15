# Web API

Browser-oriented JSON API used by the bundled UI. Every route is subject to the pipeline in `WEB_SECURITY.md`.

**Requirements for every non-GET request:** cookie session, `Origin` equal to the site origin, `Content-Type: application/json`, and header `X-CSRF-Token` (returned by `/api/session`, `/api/login`, `/api/setup`). Programmatic clients must therefore behave like a browser session; there is no static API key yet. The CLI remains the recommended CI gate (see `.github/workflows/cellar.yml`).

| Method | Route | Min role | Body → Result |
|---|---|---|---|
| GET | `/api/health` | none | `{status:"ok"}` |
| GET | `/api/session` | none | `{authenticated, user?, csrf?, setupRequired?}` |
| POST | `/api/setup` | none, first run only | `{code, username, password}` → session |
| POST | `/api/login` | none | `{username, password}` → `{user, csrf}` + cookie |
| POST | `/api/logout` | viewer | `{}` |
| POST | `/api/password` | viewer | `{current, next}`; other sessions end |
| GET | `/api/demo` | viewer | demo contract and CSVs |
| GET | `/api/config` | viewer | `{config, revision}` |
| PUT | `/api/config` | maintainer | `{config, revision}` → new `{config, revision}`; 409 if stale |
| GET | `/api/revisions` | viewer | `{revisions:[{hash, actor, at}]}` |
| POST | `/api/check` | maintainer | `{csv, advisory?}` → report |
| POST | `/api/diff` | maintainer | `{before, after}` → header diff |
| GET | `/api/history` | viewer | latest 100 summaries |
| GET / POST | `/api/users` | owner | list / `{username, password, role}` |
| POST | `/api/users/update` | owner | `{id, role?, disabled?, password?}` |
| GET | `/api/audit` | owner | latest 200 entries |
| GET | `/api/audit/verify` | owner | `{ok, entries, head, problem}` |

Status codes: 400 invalid input, 401 not signed in, 403 role/CSRF/origin, 404 unknown, 405 method, 409 stale revision, 413 too large, 415 wrong content type, 429 throttled, 503 busy, 500 internal (reference id only).
