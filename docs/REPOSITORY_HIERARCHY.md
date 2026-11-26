# Cellar Studio — canonical repository hierarchy

## Decision

**Cellar Studio is the parent company/platform repository. `Cellar` is one product repository beneath that company.** The two are not interchangeable.

### Intended GitHub repositories

| Repository | Role | Code and content | Status |
| --- | --- | --- | --- |
| `suryandugy-glitch/Cellar-Studio` | **Main company/platform repository** | Studio homepage, company structure, shared design system, product registry, cross-product interfaces, integration orchestrator and umbrella documentation | **Created via rename of the former `Cellar` repo; Studio home now at website root** |
| `Cellar` (future child repo) | **Child product: Cellar Guard** | Java 21 CSV contract checker, CLI, local backend, product API, tests and product-specific site | **Not separated yet: code currently lives in Cellar-Studio** |
| [`buildclinic`](https://github.com/suryandugy-glitch/buildclinic) | Child product candidate | Build diagnostics | Existing separate repository |
| [`ClauseCraft`](https://github.com/suryandugy-glitch/ClauseCraft) | Child product candidate | Document review prototype | Existing separate repository |
| [`systems-bottleneck-lab`](https://github.com/suryandugy-glitch/systems-bottleneck-lab) | Studio Labs candidate | PlanCliff research | Existing separate repository |
| [`PQL-Storage`](https://github.com/suryandugy-glitch/PQL-Storage) | Studio Labs candidate | CrashCheck/storage research | Existing separate repository |

The word **under** means parent-company ownership and navigation, not necessarily a single Git monorepo. GitHub does not natively nest independent repositories inside one repository with separate permissions. A parent repository can link to product repositories and integrate with them through versioned APIs and release artifacts.

## Target source layout

```text
Cellar-Studio/             # NEW primary company repository
  README.md                # company introduction and product directory
  apps/studio-web/         # company homepage / Studio UI
  packages/                # shared contracts, design tokens when implemented
  docs/                    # company architecture, product registry, governance
  .github/                 # contribution workflows and core-owned policy

Cellar/                    # EXISTING child repository, keep history and URLs
  src/main/java/           # Cellar Guard backend and CLI
  src/test/java/           # product tests
  deploy/                  # current Cellar product site and operations
  docs/                    # Cellar Guard technical documentation
```

**Do not move the Java product into the Studio web app or break its existing CLI, tests and deployments.** Other product repositories stay independent as well.

## Safe migration sequence

1. Create a new repository named **`Cellar-Studio`** owned by `suryandugy-glitch`. The old `Cellar` repository was renamed to `Cellar-Studio`; Guard's Java code remains inside Studio temporarily. A separate product repository has not yet been created.
2. Configure the intended visibility and collaborator permissions. If internal planning must be private, put it in a separate private core repository, not a public Studio site.
3. Copy the Studio-specific website assets (currently `deploy/pages/studio.html`, `studio.css`, `studio.js`) to `Cellar-Studio/apps/studio-web/`. Preserve source license/attribution.
4. Move the umbrella-only documents (`docs/CELLAR_STUDIO.md`, governance/standards) into the new Studio documentation area **after** reviewing whether anything is confidential. Keep concise public links or redirects in `Cellar`.
5. Deploy the Studio company website from `Cellar-Studio`. Keep Cellar Guard's Java backend and existing product URLs working.
6. Update all Studio navigation links and public product descriptions to point to the new parent repository. Verify links, redirects, CI, and deployments before retiring the old Studio page within `Cellar`.
7. Review and enforce branch protections and approvals in both repositories. `CODEOWNERS` does not itself restrict repository access.

## Governance

Core company decisions: **Suryandu Ganguly** (`@suryandugy-glitch`) and **Gunjan Roy** (`@roy-gunjan743`). Product contributors may work in their respective repositories without automatically receiving access to confidential company planning.

- Studio parent repository: core brand, product registry, shared platform decisions and integrations.
- Child product repositories: their own maintainers, release cadence, tests and security boundaries.
- Internal core-only repository: confidential plans visible only to explicitly invited users; this is **not** implemented by this document.

## Current migration state

This is the **target separated-repository architecture**, not the present filesystem. The `Cellar-Studio` repository now exists as the renamed original. Guard is still implemented within it. Creating a separate `Cellar` child repository, migrating the Guard source safely, and verifying permissions remain future work.
