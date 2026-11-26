# Contributing to Cellar

Thank you for helping. **This repository contains Cellar Guard, the CSV contract checker.** Other proposed Cellarverse tools currently have separate repositories.

## Your first contribution

1. Read [Getting started](docs/GETTING_STARTED.md) and the [codebase map](docs/CODEBASE_MAP.md).
2. Open [GitHub Codespaces](https://github.com/codespaces/new?repo=suryandugy-glitch%2FCellar) or install a JDK 21+ locally.
3. Run `java Build.java test` in the repository root.
4. Pick a focused issue; ask in its comments if the scope is unclear.
5. Create a `feat/<short-name>`, `fix/<short-name>`, or `docs/<short-name>` branch from `main`.
6. Change only what the issue requires; use synthetic data and add tests for behavior changes.
7. Run tests again, then open a pull request describing the problem, solution, verification and limitations.

## Engineering rules

- Keep checks deterministic. New validations must explain blank-value semantics.
- Reports must never contain CSV cell values. Preserve the distinction between a contract violation and invalid input.
- Do not add outbound telemetry, execute uploaded scripts, weaken local API boundaries or commit production data.
- Changes affecting architecture, persisted data or deployment need a design/migration note.
- Keep attribution and the existing MIT license intact.

The supported build entry point is `java Build.java test`; Maven/Gradle are not required. In an IDE, `src/main/java` and `src/test/java` are the source roots.

## Pull request checklist

- [ ] User-facing behavior or documentation is explained
- [ ] Tests pass using `java Build.java test` when Java behavior is affected
- [ ] New behavior has a synthetic example or regression test
- [ ] Sensitive data and credentials are not included
- [ ] Existing CLI output, backend routes and deployment contracts remain compatible or migration is documented
- [ ] The PR says which features are complete and which remain planned

Find the rest of the references in the [documentation index](docs/README.md).
