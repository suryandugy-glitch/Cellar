# Cellarverse development workspace

For a first-time explanation, read [Getting started](GETTING_STARTED.md) and the [documentation index](README.md).

This repository is the **Cellar Guard Java 21 product** and the planning home for the proposed Cellarverse ecosystem. It is **not** yet a monorepo for every Cellarverse product; linked products retain their own source and release cycles.

## Open a ready-to-code environment in GitHub

1. Open the [Cellar repository](https://github.com/suryandugy-glitch/Cellar).
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

## Work on the ecosystem

1. Read [Cellarverse product map](CELLARVERSE.md) and [repo standards](ECOSYSTEM_REPO_STANDARDS.md).
2. Create a focused issue with a user problem, acceptance criteria, tests and target product.
3. Create a `feat/<short-name>` or `fix/<short-name>` branch from updated `main`.
4. Keep Cellar Guard changes in this repository; change other products in their own repositories. Common contracts and design assets can be specified here before adopting them elsewhere.
5. Run `java Build.java test`, inspect the local UI if relevant, and open a pull request. Existing `.github/workflows/backend.yml` checks the Java backend.

## Proposed next work

- A public Cellarverse hub with transparent product-maturity labels and working demos.
- A versioned, privacy-conscious common findings schema and sample evidence fixtures.
- Reusable accessible color, typography and motion tokens for product sites.
- A local-first release-readiness view that combines actual output from Guard and BuildClinic.

These are backlog candidates, **not** existing shipped capabilities. Do not claim full-stack authentication, data synchronization or integrations until implemented and tested.

## Security and cost

Codespaces uses your GitHub account's available quota and may incur charges. Stop idle Codespaces. Keep credentials in Codespaces secrets, not repo configuration or `.env` commits. The development container does not automatically deploy or modify production services.
