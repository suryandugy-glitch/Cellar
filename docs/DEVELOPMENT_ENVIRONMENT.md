# Cellar Studio development workspace

For a first-time explanation, read [Getting started](GETTING_STARTED.md) and the [documentation index](README.md).

This repository contains **Cellar Guard**, the only Cellar Studio product, written in Java 21+, together with its public Studio HQ pages and documentation.

## Open a ready-to-code environment in GitHub

1. Open the [Cellar repository](https://github.com/suryandugy-glitch/Cellar-Studio).
2. Select **Code → Codespaces → Create codespace on main**. The configuration is already merged into `main`.
3. GitHub reads `.devcontainer/devcontainer.json` and provisions a JDK 21 environment with Node 22 for future frontend tooling.
4. The container runs `java Build.java test` once on creation. Wait for that command to finish before making changes.
5. Open a terminal in the repository root and run `sh run.sh`. Forwarded port 8080 serves the local Cellar web app; the launcher may select another port if 8080 is occupied (forward that port manually).

The same dev container can be opened in VS Code with the Dev Containers extension. Java tooling and Node are development conveniences; the Cellar product itself still builds offline without npm dependencies.

## Daily commands

| Command | Purpose |
| --- | --- |
| `java -version` | Confirm Java 21 or later |
| `java Build.java test` | Compile sources, run tests, produce `dist/cellar.jar` |
| `java Build.java package` | Package without running tests |
| `sh run.sh` | Run local web workspace |
| `java -jar dist/cellar.jar validate` | Validate contract configuration |
| `sh deploy/build-pages.sh` | Generate the static marketing/demo site |

The `data/`, `build/`, and `dist/` paths hold local/generated files and should not be committed. Never put actual customer CSV data or API keys in commits or issue attachments.

## Work on Cellar Guard

1. Read the [Cellar Guard manual](CELLAR_GUARD_MANUAL.md) and [contracts reference](CONTRACTS.md).
2. Create a focused issue with a customer import problem, acceptance criteria and tests.
3. Create a `feat/<short-name>` or `fix/<short-name>` branch from updated `main`.
4. Keep Java, UI, docs and CI changes scoped to Cellar Guard.
5. Run `java Build.java test`, inspect the local UI if relevant, and open a pull request. The `.github/workflows/guard-pr.yml` workflow runs a CSV compatibility check on PRs.

## Proposed next work

- Add representative export generators for more consuming applications.
- Improve CI annotations, contract change review and sample fixtures.
- Keep Guard's documentation and Java checker reproducible and accessible.

These are backlog candidates, **not** existing shipped capabilities. Do not claim full-stack authentication, data synchronization or integrations until implemented and tested.

## Security and cost

Codespaces uses your GitHub account's available quota and may incur charges. Stop idle Codespaces. Keep credentials in Codespaces secrets, not repo configuration or `.env` commits. The development container does not automatically deploy or modify production services.
