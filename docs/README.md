# Cellar documentation — start here

**New to the repository?** Read [Getting started](GETTING_STARTED.md) first. You do not need to understand the entire backend to contribute.

## What lives here?

There are **two related but distinct things**:

1. **Cellar (the working product):** a Java 21 CSV contract checker with a local web workspace, CLI, tests and public demonstration website. This repository contains its code.
2. **Cellar Studio (the primary company platform):** a product directory today, with a roadmap for connecting developer tools under one identity. The other products are **not implemented inside this repository**. See [Cellar Studio](CELLAR_STUDIO.md).

The main README describes Cellar Guard's current behavior; the ecosystem roadmap describes planned work. A planned feature is not a shipped feature.

## Find the right document

| I want to… | Read |
| --- | --- |
| Understand Cellar in plain language | [Getting started](GETTING_STARTED.md) |
| Open GitHub Codespaces and run it | [Development environment](DEVELOPMENT_ENVIRONMENT.md) |
| Find source folders, test files and commands | [Codebase map](CODEBASE_MAP.md) |
| Join the team or open a useful PR | [Contributing](../CONTRIBUTING.md) |
| Understand Cellar Studio's products and priorities | [Cellar Studio roadmap](CELLAR_STUDIO.md) |
| Follow agreed standards across projects | [Ecosystem repository standards](ECOSYSTEM_REPO_STANDARDS.md) |
| Understand why the product exists | [Product requirements](PRD.md) |
| See the overall backend architecture | [High-level design](HLD.md) |
| See implementation details | [Low-level design](LLD.md) |
| Work with CSV contract JSON | [Contracts](CONTRACTS.md) |
| Use or integrate the HTTP API | [API reference](API.md) |
| Deploy or secure the service | [Web security and deployment](WEB_SECURITY.md) |
| Run and operate the application | [Operations](OPERATIONS.md) |
| Report a vulnerability | [Security policy](../SECURITY.md) |
| Review current known limitations | [Main README — Honest limits](../README.md#honest-limits) |
| Find existing release changes | [Changelog](../CHANGELOG.md) |

Advanced references also exist for [migration](MIGRATION.md), [key rotation](KEY_ROTATION.md), [pilot templates](PILOT_TEMPLATES.md), [resources](RESOURCES.md), [startup playbook](STARTUP_PLAYBOOK.md), and [test report](TEST_REPORT.md).

## A normal first contribution

1. Read [Getting started](GETTING_STARTED.md).
2. Run `java Build.java test` in the repo root.
3. Pick one issue; reproduce the problem with synthetic data.
4. Make a focused change and add or update a test.
5. Open a pull request; describe what changed, how you tested it, and any limitations.

**Important:** Never commit API keys, real customer CSVs, personal documents or generated `data/` files.
