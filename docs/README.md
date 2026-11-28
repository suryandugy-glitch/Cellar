# Cellar Guard documentation

Cellar Studio maintains one product in this repository: **Cellar Guard**, a Java 21+ CSV compatibility checker. The [technical manual](CELLAR_GUARD_MANUAL.md) is the best starting point.

| Task | Reference |
| --- | --- |
| Install, validate CSVs and connect GitHub PR checks | [Cellar Guard manual](CELLAR_GUARD_MANUAL.md) |
| Get started with a synthetic demonstration | [Getting started](GETTING_STARTED.md) |
| Define required headers, row rules and integrations | [Contracts](CONTRACTS.md) |
| Integrate the Java HTTP API | [API reference](API.md) |
| Secure a shared Java workspace | [Web security](WEB_SECURITY.md) |
| Run, back up and operate the workspace | [Operations](OPERATIONS.md) |
| Understand architecture and source folders | [High-level design](HLD.md), [Low-level design](LLD.md), [Codebase map](CODEBASE_MAP.md) |
| Develop and contribute | [Development environment](DEVELOPMENT_ENVIRONMENT.md), [Contributing](../CONTRIBUTING.md) |
| Report a vulnerability | [Security policy](../SECURITY.md) |

Some older planning documents remain in Git history or documentation for engineering context. They are **not** live products and are not part of the public product catalogue.

The main website is [Studio HQ](https://cellar-csv.vercel.app/) and the only product page is [Cellar Guard](https://cellar-csv.vercel.app/guard.html). The website uses synthetic examples; actual checking happens in the Java CLI or self-hosted workspace.
