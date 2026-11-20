# Cellar web API

The bundled frontend uses this JSON API. By default the app serves a local
workspace without sign-in. Requests to workspace routes include
`X-Access-Key` when the server has `CELLAR_ACCESS_KEY` configured. Store that
key in the calling application's secret store.

POST and PUT requests require `Content-Type: application/json` and a matching
`Origin` header, including any non-default port. The bundled Java frontend
uses the API's own origin. A hosted frontend can use the single HTTPS origin
configured as `CELLAR_FRONTEND_ORIGIN`. Only that external origin is accepted
for cross-site or same-site browser API requests. CORS preflight checks the
route, method and requested headers. Protected requests still require
`X-Access-Key`. For CI, use the Java CLI with synthetic exports.

| Method | Route | Access key | Input and response |
|---|---|---|---|
| GET | `/api/health` | Public | `{status: "ok"}` |
| GET | `/api/ready` | Public | `{status: "ready"}` when serving and the data directory is writable |
| GET | `/api/session` | Public | `{keyRequired, version, ai}` |
| GET | `/api/demo` | Workspace | Sample contract and synthetic CSV exports |
| GET | `/api/config` | Workspace | `{config, revision}` |
| PUT | `/api/config` | Workspace | `{config, revision}` → current contract and new revision |
| GET | `/api/revisions` | Workspace | Saved revision metadata |
| POST | `/api/restore` | Workspace | `{hash}` → restored contract and revision |
| POST | `/api/check` | Workspace | `{csv, advisory?}` → validation report and agent findings |
| POST | `/api/diff` | Workspace | `{before, after}` → header changes and impacted integrations |
| POST | `/api/scout` | Workspace | `{csv}` → suggested integration |
| GET | `/api/history` | Workspace | Up to 100 recent check summaries |
| GET | `/api/stats` | Workspace | Check counts, integration count, uptime and inbox path |
| GET | `/api/live` | Workspace | Up to 30 recent inbox results |
| GET | `/api/activity` | Workspace | Up to 200 recent activity entries |
| GET | `/api/activity/verify` | Workspace | `{ok, entries, head, problem}` |
| POST | `/api/ai` | Workspace | `{task, question?, report?}` → `{model, text}` when configured |

A valid check returns HTTP 200 whether the export passes or blocks a release.
Use `blocking` for the release decision. Invalid requests return 400, missing
or invalid credentials 401, origin rejections 403, unknown routes 404, wrong
methods 405, stale revisions 409, oversized requests 413, unsupported content
types 415, throttled requests 429, and temporary overload 503. For 429 or 503,
use `Retry-After` before retrying. Save the `X-Request-ID` response header when
reporting an internal error.

POST bodies have per-route limits. The check and scout envelopes allow up to
9 MiB and compare up to 17 MiB. The CSV engine separately limits each CSV to
8 MiB. JSON escaping can increase the envelope size.
