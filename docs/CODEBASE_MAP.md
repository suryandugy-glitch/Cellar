# Codebase map and change guide

This is the **Cellar Guard** codebase. It is a lightweight Java 21 application with a separately generated static demonstration site.

## Main folders and files

| Path | Purpose | Typical changes |
| --- | --- | --- |
| `src/main/java/` | Java application, validation rules, web server, CLI | Backend behavior or bug fixes |
| `src/main/resources/` | Files bundled into the Java application | Bundled web assets and resources |
| `src/test/java/` | Java tests | Regression and rule tests |
| `Build.java` | Offline build, test and package runner | Build logic |
| `run.sh`, `run.bat` | Local launchers | Startup behavior |
| `deploy/` | Static-site generation and server deployment files | Marketing/demo pages and hosting |
| `.github/workflows/` | GitHub Actions for backend, Pages and releases | CI/CD |
| `.devcontainer/` | GitHub Codespaces development environment | Tooling |
| `docs/` | User, contributor, API, architecture and operations references | Documentation |
| `examples/` | Example input/configuration | Reproducible sample cases |
| `assets/` | Brand and other static assets | Visual assets |

Use the existing structure rather than creating a new application framework just for a small feature. The canonical detailed design is [HLD](HLD.md) and [LLD](LLD.md).

## What happens when you press Run check?

1. A user selects an integration/contract and a CSV input in the local workspace.
2. The Java checker evaluates the CSV structure and declared rules.
3. Cellar produces rule findings, suggested next steps and a release verdict.
4. The web workspace presents the result; CLI commands can emit machine-usable status codes.

This is an explanation of the product flow, not a claim that Cellarverse's future shared reporting format is already implemented.

## Verify changes

| Changed area | Minimum verification |
| --- | --- |
| Java validation or API | `java Build.java test`, plus a targeted synthetic regression case |
| Static public site | `sh deploy/build-pages.sh` and manual responsive preview |
| Vercel build code | `node deploy/build-vercel.mjs` and review generated output |
| User-facing docs | Check commands, links, feature maturity and examples |
| Deployment/security | Follow [deployment guidance](WEB_SECURITY.md); never test using real secrets in a PR |

Generated output such as `build/`, `dist/` and local `data/` is not source code. Do not commit credentials or private uploads.

## Release boundaries

- This repository can build a local **Java** server and a separate public demonstration website.
- The public website is not automatically the complete authenticated Java workspace.
- Cloud backend hosting requires an explicit compatible Java host and configured origins. See [README deployment section](../README.md#deploy-the-site-and-connect-the-workspace).

## Where to propose ecosystem work

See [Cellarverse](CELLARVERSE.md). Open a GitHub issue with the user problem, affected product, actual evidence, intended scope, acceptance criteria and tests. Do not silently rename or migrate other contributors' repositories.
