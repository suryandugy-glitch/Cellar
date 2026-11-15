<p align="center"><img src="assets/logo.svg" alt="Cellar" width="240"></p>

<h3 align="center">Catch the CSV change that breaks a customer's import, before it ships.</h3>

<p align="center">
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

You need **Java 21+**. No other installs, no account, no sign-in.

```sh
git clone https://github.com/suryandugy-glitch/Cellar.git
cd Cellar
sh run.sh            # Windows: run.bat
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
| | AI agents *(optional)* | Explain a result for your team, draft a message to the owner, review your contract, answer questions. Off until you set `CELLAR_AI_KEY` |
| **Automation** | Live inbox | Drop a `.csv` into `data/inbox/` and it is checked within seconds |
| | CLI + CI | Same engine on the command line, exit codes `0` ok / `1` blocked / `2` invalid |
| **Team** | Contract revisions | Stale edits are rejected; **restore** any earlier version in one click |
| | Import / export | Move contracts as JSON; download reports as Markdown or JSON |
| | Activity log | Chained log that shows if it was edited |
| **Comfort** | Plain-English results | Every finding says what happened and what to do |
| | Docs, search, themes | In-app docs, `Ctrl K` command palette, light and dark glass UI |
| **Safety** | No cell values stored | Reports hold column names, counts and row numbers only |
| | Hardened server | Encrypted storage, size and rate limits, host/origin checks, strict CSP |

> The five agents above are **built-in rules**: offline, fast and private. The **AI agents** are optional and use your own API key (Anthropic or OpenAI-compatible). They receive only the contract, column names, counts and rule results, **never your CSV rows**.

```sh
CELLAR_AI_KEY=your-key  CELLAR_AI_PROVIDER=anthropic  sh run.sh
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

Local use needs no settings. To share on a network, set a single shared key and put Cellar behind HTTPS:

```sh
CELLAR_BIND=0.0.0.0
CELLAR_PUBLIC_URL=https://cellar.example.com
CELLAR_ACCESS_KEY=a-long-shared-key      # 12+ characters; there are no user accounts
CELLAR_TRUST_PROXY=true
CELLAR_DATA=/var/lib/cellar
```

Cellar refuses to listen beyond localhost without an access key. Back up the data folder together with the master key. Deployment files are in `deploy/`.

## Build and test

```sh
java Build.java test     # compiles, runs the test suite, packages dist/cellar.jar
```

No Maven, Gradle or downloads needed.

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
