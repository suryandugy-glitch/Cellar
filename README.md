<p align="center"><img src="assets/logo.svg" alt="Cellar" width="240"></p>

<h3 align="center">Catch the CSV change that breaks a customer's import, before it ships.</h3>

<p align="center">
  <a href="https://suryandugy-glitch.github.io/Cellar/">Website and sample checks</a> ·
  <a href="https://github.com/suryandugy-glitch/Cellar">GitHub</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#what-you-get">Features</a> ·
  <a href="#use-it-in-ci">CI</a> ·
  <a href="#share-it-on-a-server">Deploy</a> ·
  <a href="docs/API.md">API</a>
</p>

<p align="center">
  <img alt="Java 21" src="https://img.shields.io/badge/Java-21+-orange">
  <img alt="Dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen">
  <img alt="Sign-in" src="https://img.shields.io/badge/sign--in-not%20needed-blue">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey">
</p>

---

> **Cellar Studio platform:** Cellar Guard is the CSV compatibility product within a proposed family of developer tools. See the [Cellar Studio product map and roadmap](docs/CELLAR_STUDIO.md) and [repository standards](docs/ECOSYSTEM_REPO_STANDARDS.md). Existing product names, maintainers, and deployments are unchanged.

**Cellar Studio preview:** [Explore the Cellar Studio product directory](https://suryandugy-glitch.github.io/Cellar/studio.html). This is a navigable directory, not yet a shared account or cloud dashboard.

## Start here

**New to Cellar?** Choose the guide that matches what you want to do:

| Goal | Where to go |
| --- | --- |
| Understand Cellar in five minutes | [Getting started](docs/GETTING_STARTED.md) |
| Open a browser-based coding workspace | [GitHub Codespaces setup](docs/DEVELOPMENT_ENVIRONMENT.md) |
| Find code, backend, tests and website files | [Codebase map](docs/CODEBASE_MAP.md) |
| Find all technical and product documentation | [Documentation index](docs/README.md) |
| Contribute a fix or feature | [Contributing](CONTRIBUTING.md) |
| Explore the proposed Cellar Studio company | [Cellar Studio roadmap](docs/CELLAR_STUDIO.md) |

**Current product:** Cellar checks CSV exports against contracts using a Java 21 backend, CLI and local web workspace. **Platform direction:** Cellar Studio will organize other developer tools, but those products are not all implemented in this repository. The public demonstration website is not the full Java backend.

## What is Cellar?

Cellar is **spell-check for the files other software reads.** Your app produces a CSV. Your customers' tools expect certain columns. If someone renames or removes one, nothing looks wrong on your side, but a customer's import fails days later.

Cellar checks the file *before release*, names the customer workflow that would break, and explains the fix in plain language.

```text
FAIL  inventory-report  requires order_id
PASS  finance-summary   satisfies its contract
Triage: "order_id" was probably renamed to "id". Keep both until the report is updated.
Verdict: do not ship.                                   (exit code 1)
```

**Who is it for?** Small agencies and product teams that send recurring exports, their team leads, and the support staff who get the angry email when an import breaks. You don't need to be a developer to read the results.

## Quick start

The public website includes reports for two synthetic exports. To check your own
CSV or edit the contracts, start the Java app.

You need **Java 21+**. No other installs, no account, no sign-in.

```sh
git clone https://github.com/suryandugy-glitch/Cellar.git
cd Cellar
sh run.sh            # Windows: run.bat
```

Running `run.sh` from the repo root creates `./data`; it is ignored and must never be committed.
The launcher automatically compiles and packages `dist/cellar.jar` from source if not present. If you download a prebuilt `cellar.jar` from GitHub Releases instead, always verify its checksum against `SHA256SUMS.txt` before running:
```sh
sha256sum -c dist/SHA256SUMS.txt
# or on Windows PowerShell:
# Get-FileHash dist\cellar.jar -Algorithm SHA256
```

Open the address it prints (usually `http://127.0.0.1:8080`; if that port is busy it picks the next free one).

1. Go to **Check** and press **Breaking demo**, then **Run check**.
2. Read the answer: Inventory fails, Finance passes, and the agents explain why.
3. Open **Contracts** to see the rules, or press **Scout a contract** to build rules from your own CSV.

## What you get

| | Feature | In plain words |
|---|---|---|
| **Checks** | Contract rules | Required columns, types, ranges, allowed values, unique, not-empty, row counts |
| **Agents** | Triage | Spots renamed columns and proposes a safe migration |
| | Release gate | Clear *ship* or *block* verdict on every run |
| | Reporter | Writes the pull request comment for you |
| | Drift watch | Flags changes since the last passing export |
| | Scout | Drafts a contract from a sample CSV in one click |
| | AI agents *(optional)* | A small agent on each page (explain a result, suggest fixes, draft an owner message, explain a contract or comparison, summarize history and the inbox) and a chat assistant. Works with Anthropic or OpenAI keys. Off until you set `CELLAR_AI_KEY` |
| **Automation** | Live inbox | Drop a `.csv` into `data/inbox/` and it is checked within seconds |
| | CLI + CI | Same engine on the command line, exit codes `0` ok / `1` blocked / `2` invalid |
| **Team** | Contract revisions | Stale edits are rejected; **restore** any earlier version in one click |
| | Import / export | Move contracts as JSON; download reports as Markdown or JSON |
| | Activity log | Chained log that shows if it was edited |
| **Comfort** | Dashboard | Checks run, pass rate, and the health of every integration at a glance |
| | Add integrations without JSON | A simple form: name, owner, columns |
| | Filter and export | Show only failures; download history as CSV |
| | Plain-English results | Every finding says what happened and what to do |
| | Docs, search, themes | In-app docs, `Ctrl K` command palette, light and dark glass UI |
| **Safety** | No cell values stored | Reports hold column names, counts and row numbers only |
| | Hardened server | Encrypted storage, size and rate limits, host/origin checks, strict CSP |

> The first five agents are **built-in rules**: offline, fast and private. The **AI agents** are optional and use your own API key. They receive only the contract, column names, counts, rule codes, recent history and inbox results, plus the question you type. **CSV rows are never sent.**

```sh
CELLAR_AI_KEY=your-key
CELLAR_AI_PROVIDER=anthropic      # or openai
CELLAR_AI_MODEL=claude-sonnet-5-5 # optional
CELLAR_AI_DAILY_LIMIT=200         # requests per day, default 200
sh run.sh
```

## A contract in 10 lines

```json
{
  "version": 2,
  "integrations": [
    {
      "id": "inventory-report",
      "owner": "Inventory team",
      "required": ["order_id", "sku"],
      "rules": { "order_id": { "notEmpty": true, "unique": true } }
    }
  ]
}
```

Full reference: [docs/CONTRACTS.md](docs/CONTRACTS.md).

## Command line

```sh
java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
java -jar dist/cellar.jar diff --baseline old.csv --csv new.csv
java -jar dist/cellar.jar validate
java -jar dist/cellar.jar export-demo --out build/sales.csv [--demo-break]
```

## Use it in CI

```yaml
name: cellar
on: pull_request
permissions: { contents: read }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: java Build.java package
      - run: java -jar dist/cellar.jar export-demo --out build/sales.csv
      - run: java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
```

Point the export step at your real exporter using synthetic data.

## Share it on a server

Local use needs no settings. For a shared workspace, set `CELLAR_DOMAIN`,
`CELLAR_ACCESS_KEY` and `CELLAR_MASTER_KEY` in the deployment environment.
Point the domain at your host, then start the Java service and Caddy together.

```sh
docker compose -f deploy/docker-compose.yml up -d --build --wait
```

Use one server per data directory and back up the encrypted data volume and
its original master key separately. See the
[deployment and restore guide](docs/WEB_SECURITY.md) for the settings and upgrade steps.

## Build and test

```sh
java Build.java test     # compiles, runs the test suite, packages dist/cellar.jar
```

No Maven, Gradle or downloads needed.

Build the static website with `sh deploy/build-pages.sh`. The files are written
to `build/pages`. In the repository's **Settings → Pages**, select **GitHub
Actions** as the source. The **Website** workflow publishes after pushes to
`main` and can also be run manually.

## Deploy the site and connect the workspace

Import this repository into Vercel and keep the repository root as the project
root. The settings in `vercel.json` build the overview, animated walkthrough,
setup guide, and full sample reports with Node.js. The build needs no Java installation or npm dependencies.

The public demo works with no environment variables. To run the full workspace
from Vercel, deploy Java using the [deployment guide](docs/WEB_SECURITY.md),
then set both origins.

| Where | Variable | Example |
|---|---|---|
| Java host | `CELLAR_FRONTEND_ORIGIN` | `https://cellar.example.com` |
| Vercel | `CELLAR_WORKSPACE_URL` | `https://cellar-api.example.com` |

Restart Java after changing its allowlist and redeploy Vercel after setting
the API URL. Open **Open workspace** on the Vercel site and enter the shared
access key. The browser sends uploads directly to the Java API, which stores
the contracts and run history. Keep the Java keys on the backend host.

Use the exact HTTPS origin your team visits. Vercel's per-deployment preview
URLs are distinct origins. Set `CELLAR_WORKSPACE_URL` in the deployment
environment that uses the allowed origin. Optionally set `CELLAR_SITE_URL`
to override Vercel's production hostname in page metadata.

Run `node deploy/build-vercel.mjs` locally to build the same output in
`build/vercel`. When sample data or check output changes, refresh the bundled
reports from the Java checker:

```sh
sh deploy/build-pages.sh
cp build/pages/samples/* deploy/pages/samples/
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Operation failed" on start | Read the `DETAIL` line under it. Usually Java older than 21 or an unwritable folder; try `--data some-folder` |
| Port already in use | Cellar tries the next ports, or run with `--port 9090` |
| Asked for an access key on localhost | `CELLAR_ACCESS_KEY` is set in your environment; unset it |
| "Column missing" but it is there | Names must match exactly, including capitals and spaces |

## Honest limits

A working beta for pilots. One shared workspace, no SSO or per-customer workspaces yet, and no independent security audit. A pass means *your declared rules were met*; it does not prove every value is right for every importer.

## Roadmap

Scoped API tokens for CI · per-repository workspaces · Slack and email alerts · GitHub App with PR comments · optional AI explanations.

## Contributing

Issues and ideas are welcome at [github.com/suryandugy-glitch/Cellar](https://github.com/suryandugy-glitch/Cellar). See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under the [MIT License](LICENSE).
