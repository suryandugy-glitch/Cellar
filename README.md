<p align="center">
  <img src="assets/logo-mark.svg" alt="Cellar Studio logo" width="88">
</p>

<h1 align="center">CELLAR STUDIO</h1>

<p align="center"><strong>We build what comes next.</strong></p>
<p align="center">An independent creative technology studio exploring ideas, engineering research, design and future products. Our public website introduces the studio; it does not currently offer finished software downloads.</p>

<p align="center">
  <a href="https://cellar-csv.vercel.app/">Company website</a> ·
  <a href="https://cellar-csv.vercel.app/about.html">About us</a> ·
  <a href="https://cellar-csv.vercel.app/licenses.html">Licensing</a> ·
  <a href="https://cellar-csv.vercel.app/certifications.html">Credentials</a> ·
  <a href="https://cellar-csv.vercel.app/privacy.html">Privacy</a> ·
  <a href="https://cellar-csv.vercel.app/cookie-policy.html">Cookies</a> ·
  <a href="https://cellar-csv.vercel.app/terms.html">Terms</a> ·
  <a href="https://cellar-csv.vercel.app/refund-policy.html">Refunds</a> ·
  <a href="https://cellar-csv.vercel.app/business.html">Business details</a> ·
  <a href="https://cellar-csv.vercel.app/contact.html">Enquiries</a> ·
  <a href="https://cellar-csv.vercel.app/policies.html">Policies</a> ·
  <a href="https://cellar-csv.vercel.app/guard.html">Guard demonstration</a> ·
  <a href="https://cellar-csv.vercel.app/explore.html">Ideas and research</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center"><sub>Company website · Research and experiments · Open-source development · MIT licensed repository</sub></p>

---

## What is Cellar Studio?

**Cellar Studio** is an independent creative technology identity and a home for ideas, experimental engineering and future services. Its first flagship product and exact startup direction have **not been announced**. The [main website](https://cellar-csv.vercel.app/) is an informational company homepage, **not a software store, download center or hosted application platform**. No finished software is offered for download from that homepage.

Some repositories contain working prototypes and developer-facing source code. These are separate from the public website and should not be interpreted as released, supported Studio software. The existence of a project brief or demo does not mean an app is available to install.

The company [About Us](https://cellar-csv.vercel.app/about.html), [Licensing](https://cellar-csv.vercel.app/licenses.html) and [Certifications & Credentials](https://cellar-csv.vercel.app/certifications.html) pages explain the team, repository terms and current certification status. No verified company-level certifications are presently claimed.

Public [privacy](https://cellar-csv.vercel.app/privacy.html), [cookies and storage](https://cellar-csv.vercel.app/cookie-policy.html), [website terms](https://cellar-csv.vercel.app/terms.html), [refund status](https://cellar-csv.vercel.app/refund-policy.html), and [business details](https://cellar-csv.vercel.app/business.html) pages explain the current informational site. An [enquiry form](https://cellar-csv.vercel.app/contact.html) prepares and copies a local draft; **it does not submit or transmit a message**, and there is no online checkout. Optional third-party embeds require an explicit browser preference; none are currently active.

Our existing developer-infrastructure experiments tackle failure modes and aim to answer four questions:

1. **What failed?** Name the broken contract, invariant, or dependency.
2. **Where is the evidence?** Make the result reproducible and inspectable.
3. **Who or what is affected?** Explain the impact in practical terms.
4. **What happens next?** Provide a useful fix, safe migration, or release decision.

The Studio homepage introduces the company, its approach and possible directions. Legacy example pages remain accessible for context, but they do not constitute a product launch. The website has no shared user accounts, online checkout, software download service or production backend for the research projects.

### The structure today

| Layer | Purpose | Current state |
| --- | --- | --- |
| **Cellar Studio** | Company introduction, ideas, project background and common visual language | Live informational website |
| **Project concepts** | Potential developer tools and independent source projects | Exploration; not a downloadable catalogue |
| **Studio Labs** | Systems research with testable hypotheses and reproducible experiments | Research and prototypes |
| **Shared platform** | Common identity, reports, permissions and cross-product workflows | Planned; not deployed |

This repository was renamed from **Cellar** to **Cellar-Studio**. It still contains the complete **Cellar Guard** Java implementation. A separate child repository for Guard is a future migration, not a completed split. Read the [repository hierarchy](docs/REPOSITORY_HIERARCHY.md) before moving code or changing ownership.

## Ideas and engineering experiments

The entries below describe areas of work, **not software available to download from the Studio website**. Links lead to concept briefs, static demonstrations or source repositories where available. There are no promised releases or installation buttons on the company homepage.

| Area | Problem being explored | Verified state | Reference |
| --- | --- | --- | --- |
| **Cellar Guard** | CSV exports can break downstream imports | Java pilot source in this repository; website shows static samples | [Example page](https://cellar-csv.vercel.app/guard.html) · [Local instructions](#existing-developer-code-cellar-guard) |
| **SpaceFix** | Investigating safer ways to free disk space | Concept only in this repository; no downloadable desktop release | [Idea brief](https://cellar-csv.vercel.app/explore.html#spacefix) |
| **Deadlock Sentinel** | Identifying circular waits in JVM thread dumps | Local Java research prototype; not hosted as an installable app | [Source and tests](products/deadlock-sentinel/README.md) |
| **BuildClinic** | Making build errors easier to diagnose | Exploration; no Studio-hosted application claimed | [Idea brief](https://cellar-csv.vercel.app/explore.html#buildclinic) |
| **ClauseCraft** | Inspecting risky document patterns | Exploration; not legal advice or an online service | [Idea brief](https://cellar-csv.vercel.app/explore.html#clausecraft) |
| **PlanCliff** | Studying database query-plan regressions | Research direction, not a shipped product | [Research brief](https://cellar-csv.vercel.app/explore.html#plancliff) |
| **CrashCheck** | Testing SQLite-backed apps after abrupt termination | Storage research, not a Studio-hosted service | [Research brief](https://cellar-csv.vercel.app/explore.html#crashcheck) |
| **Cellar Learn** | Explaining engineering concepts interactively | Possible future direction | [Idea brief](https://cellar-csv.vercel.app/explore.html#learn) |

These descriptions are intentionally provisional. Source code, a research page and a working release are different things; independent repositories retain their own licenses and contributors.

## Existing developer code: Cellar Guard

Cellar Guard checks CSV files against declared contracts **before** a release. For example, a customer import expects `order_id`, but a new export renames it to `id`:

```text
FAIL  inventory-report  requires order_id
PASS  finance-summary   satisfies its contract
Triage: "order_id" may have been renamed to "id".
Verdict: do not ship.                         (exit code 1)
```

The separate [Guard example page](https://cellar-csv.vercel.app/guard.html) includes **synthetic demonstrations and sample reports**. It does not run the complete Java backend, offer an installer or accept live customer files. Developers who want to examine the existing Java pilot can build and run its source code locally, as described below. This is **not a downloadable product offered on the Studio homepage**.

<a id="quick-start"></a>

### Run the real application locally

Prerequisite: **JDK 21 or newer**. No Maven, Gradle, npm installation, account, or API key is required for the core checker.

**macOS / Linux**

```sh
git clone https://github.com/suryandugy-glitch/Cellar-Studio.git
cd Cellar-Studio
sh run.sh
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/suryandugy-glitch/Cellar-Studio.git
cd Cellar-Studio
.\run.bat
```

The launcher builds `dist/cellar.jar` if needed and starts the local web workspace. Open the address printed in the terminal (usually **http://127.0.0.1:8080**; a free port is selected if 8080 is occupied).

1. Select **Check → Breaking demo → Run check**.
2. Inspect the inventory failure, finance pass and suggested migration.
3. Open **Contracts** to edit rules or use **Scout** to draft a contract from a sample.

Local data is stored under the ignored `data/` directory. **Do not commit customer CSVs, API keys or local data files.**

### Use the CLI

After `java Build.java test` or `java Build.java package` has created the JAR:

```sh
java -jar dist/cellar.jar export-demo --out build/sales.csv
java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
java -jar dist/cellar.jar validate
```

The checker uses exit code **0** for allowed results, **1** for blocked releases and **2** for invalid input or usage errors. See the [contract format](docs/CONTRACTS.md), [CLI and operations guide](docs/OPERATIONS.md), and [API reference](docs/API.md).

### Use it in CI

The same checker can stop a release when a synthetic or generated export violates a contract:

```yaml
name: csv-contract-check
on: pull_request
permissions: { contents: read }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21' }
      - run: java Build.java package
      - run: java -jar dist/cellar.jar export-demo --out build/sales.csv
      - run: java -jar dist/cellar.jar check --csv build/sales.csv --summary --format markdown
```

Replace the demo export with a **synthetic fixture generated by your own exporter**. The example does not test real production data or post GitHub comments automatically.

### What you get

- **Validation:** required columns, data types, numeric ranges, allowed values, uniqueness, not-empty rules and row limits.
- **Change detection:** schema differences, suspected renames, contract revisions, restoration and drift against a passing baseline.
- **Release workflow:** clear pass/block verdicts, CLI/CI exit codes, downloadable Markdown/JSON reports and an activity history.
- **Local automation:** inbox monitoring, contract scouting and offline rule-based explanations.
- **Optional AI assistance:** metadata-based explanations when the operator configures their own provider key. It is off by default; CSV cell values are not sent to the AI provider.

Guard produces findings against the rules you declare; a successful check is **not** a guarantee that every downstream system will accept every value. There is no shared multi-tenant SaaS or SSO in this repository today.

<a id="build-and-test"></a>

## Develop and verify

| Work area | Source | Verification |
| --- | --- | --- |
| Java checker, CLI and HTTP API | `src/main/java/` | `java Build.java test` |
| Java tests | `src/test/java/` | `java Build.java test` |
| Web UI served by Java | `src/main/resources/web/` | Java tests and a manual local browser check |
| Studio / Guard static pages | `deploy/pages/` | `sh deploy/build-pages.sh` |
| Vercel packaging and routing | `deploy/build-vercel.mjs`, `vercel.json` | `node deploy/build-vercel.mjs` |
| Deadlock Sentinel prototype | `products/deadlock-sentinel/` | [Prototype tests](products/deadlock-sentinel/README.md#test) |
| Architecture and operating docs | `docs/` | [Documentation index](docs/README.md) |

Run the core tests:

```sh
java Build.java test
sh deploy/build-pages.sh
node deploy/build-vercel.mjs
```

The build outputs (`dist/` and `build/`) are generated artifacts. The GitHub **Backend** and **Website** workflows provide the pull-request checks; see the [contribution guide](CONTRIBUTING.md) for the expected review process.

New contributors can use [GitHub Codespaces](docs/DEVELOPMENT_ENVIRONMENT.md) or a local JDK. No genuine customer data is needed to reproduce the examples.

<a id="share-it-on-a-server"></a>
<a id="deploy-the-site-and-connect-the-workspace"></a>

## Deployment boundaries

| Component | Deployment | Important distinction |
| --- | --- | --- |
| [Cellar Studio](https://cellar-csv.vercel.app/) | Vercel static website (primary homepage) | Company information and ideas; no software downloads |
| [Cellar Guard](https://cellar-csv.vercel.app/guard.html) | Vercel static demonstration, using the same web build | Synthetic examples; not the persistent Java workspace |
| Guard Java workspace | Local machine or separately provisioned Java host | Real CSV checks, contract editing, history and API |

Vercel uses `vercel.json` and `node deploy/build-vercel.mjs` to build the public pages. The primary `cellar-csv.vercel.app/` URL opens **Studio HQ**; `/guard.html` is a separate static example. The legacy Studio HQ hostname redirects to the primary domain.

A shared Java deployment requires HTTPS, origin restrictions and server-side keys. Configure the Java host first; connect a separate frontend only with the documented origin settings. **Do not place `CELLAR_ACCESS_KEY` or `CELLAR_MASTER_KEY` in public frontend code.** Follow [security and deployment](docs/WEB_SECURITY.md) and [operations](docs/OPERATIONS.md). The optional AI key remains server-side.

## Honest limits

- **No finished software is available for download from the company homepage.** Project briefs are informational and must not be mistaken for releases.
- The public Guard page is a static demonstration. Uploading and storing your own CSV requires the separately run Java workspace.
- Guard is a **working pilot**, not a multi-tenant production SaaS or an independently audited security product.
- A passing CSV check only proves that the **declared** rules passed. It does not prove the meaning or correctness of every data value.
- Studio's shared login, organization permissions, unified report backend and cross-product orchestration are **not implemented**.
- Research products must publish reproducible evidence before they can be described as production-ready.

<a id="roadmap"></a>

## Roadmap and governance

- **Now:** keep Guard verifiable, improve the Studio product experience, and maintain honest documentation and tests.
- **Next:** versioned report interchange, stronger CI integrations, and reproducible benchmarks for research tools.
- **Later:** opt-in shared accounts, project-level permissions and cross-product workflows, subject to security review.

Company-level decisions and the current core ownership are documented in [core governance](docs/CORE_GOVERNANCE.md). This is a **public repository**: CODEOWNERS and a public governance file do not make internal information private or revoke GitHub access. Keep confidential operations in a separately access-controlled location.

### Documentation

| Start here | Deeper technical references |
| --- | --- |
| [Getting started](docs/GETTING_STARTED.md) | [High-level design](docs/HLD.md) · [Low-level design](docs/LLD.md) |
| [Company roadmap](docs/CELLAR_STUDIO.md) | [Product requirements](docs/PRD.md) · [Repository hierarchy](docs/REPOSITORY_HIERARCHY.md) |
| [Codebase map](docs/CODEBASE_MAP.md) | [Contracts](docs/CONTRACTS.md) · [API](docs/API.md) |
| [Contribution guide](CONTRIBUTING.md) | [Security](SECURITY.md) · [Deployment](docs/WEB_SECURITY.md) |

<a id="contributing"></a>

## Contributing and license

Issues, bug reports and focused pull requests are welcome. Include a reproducible synthetic example, describe the affected product, explain tests and limitations, and preserve existing contributors' attribution. See [CONTRIBUTING.md](CONTRIBUTING.md).

Licensed under the [MIT License](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release history.
