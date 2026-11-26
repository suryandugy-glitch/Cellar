# Cellar Studio — company platform and product ecosystem

> **Brand decision:** **Cellar Studio** is the main platform and company-facing identity. **Cellar Guard** remains the name of the existing CSV compatibility checker. The Studio directory is live; a unified multi-product backend is not yet implemented.

## Studio today

[Cellar Studio](https://suryandugy-glitch.github.io/Cellar/studio.html) is the first public product directory, with search, maturity filters, and links to existing projects. It is a static presentation layer. Shared sign-in, central reporting, and team workspaces remain future proposals.

The [core governance and company structure](CORE_GOVERNANCE.md) names Suryandu Ganguly and Gunjan Roy as the current core decision-makers and explains the public/private access boundary.

## Product hierarchy

- **Cellar Studio** — primary identity, navigation, documentation, and future optional shared workspace.
- **Studio products** — focused applications such as Cellar Guard and BuildClinic; each retains its own runtime, codebase and release lifecycle.
- **Studio Labs** — research candidates (PlanCliff and CrashCheck) until they have reproducible results and a supported release.
- **Shared services (planned)** — project identity, report interchange, access controls and release history. A Studio listing does not mean a tool already sends data to Studio.

## The company promise

**Find fragile software boundaries before they break users.**

Developers ship APIs, files, builds, databases and distributed systems. Cellar Studio tools make these boundaries observable, testable and explainable before release.

The shared product principle: every tool must answer **what broke, who is affected, what evidence supports the finding, and what to do next**.

## Product map

| Product | Developer bottleneck | Current code | Maturity |
|---|---|---|---|
| **Cellar Guard** | CSV exports silently break downstream imports | [Cellar](https://github.com/suryandugy-glitch/Cellar) | Working pilot; Java checker and web interface |
| **Cellar BuildClinic** | Build logs are long and fixes are hard to identify | [buildclinic](https://github.com/suryandugy-glitch/buildclinic) | Browser-only diagnostic tool |
| **Cellar ClauseCraft** | Teams need help spotting risky text patterns in contracts | [ClauseCraft](https://github.com/suryandugy-glitch/ClauseCraft) | Separate existing prototype; not legal advice |
| **Cellar PlanCliff** | Query performance regresses as data distributions change | [Systems Bottleneck Lab](https://github.com/suryandugy-glitch/systems-bottleneck-lab) | Research prototype |
| **Cellar CrashCheck** | SQLite application invariants fail at crash boundaries | [PQL](https://github.com/suryandugy-glitch/PQL) / [PQL-Storage](https://github.com/suryandugy-glitch/PQL-Storage) | Research and storage-engineering development |
| **Cellar Learn** | New engineers need approachable visual explanations | [dsa-visualizer](https://github.com/suryandugy-glitch/dsa-visualizer) | Educational project; potential ecosystem fit |

These are **portfolio candidates**, not automatically rebranded projects. Reuse existing code and licenses; preserve collaborators' ownership and contributions. Products can be listed under Studio without renaming their source repositories. Changes to maintainership, branding, licensing or support require maintainer agreement.

## Experience architecture

```text
Cellar Studio platform / developer hub
  ├── Discover products and compare problems solved
  ├── Each product has its own focused landing page
  ├── Read the docs and run a demo without signing in
  └── Shared account/workspace (future opt-in service)
        ├── Projects and integrations
        ├── Evidence and reports
        ├── Release gates / CI status
        └── Team permissions and notifications
```

Do **not** couple a working offline CLI or local checker to a mandatory cloud login. Shared services should be optional and have clear privacy boundaries.

## Shared engineering foundation

1. **Design system:** one token library (typography, spacing, color, icons, motion), accessible light/dark variants and consistent empty/error/loading states. Products may retain their own accent colors.
2. **Evidence format:** a versioned finding schema with `tool`, `rule`, `severity`, `location`, `impact`, `remediation`, `reproducibility`, and `sourceVersion`. Avoid storing raw confidential file contents in shared reports by default.
3. **Integration adapters:** opt-in GitHub Checks/PR comments, CLI exit codes, local file intake and webhook events; each product owns its domain-specific rules.
4. **Service security:** scoped project tokens, audited access, secrets kept server-side, quotas, input size limits, encryption/backups and clear retention settings.
5. **Quality gates:** repeatable tests, documented limitations, release notes, dependency audits and deployment smoke checks before announcing a product as production-ready.
6. **Brand and docs:** one consistent README/CONTRIBUTING/SECURITY template and product pages that show a genuine before/after example.

## What to build first

### Phase 1 — coherent portfolio

- Publish an ecosystem page with a product directory, honest maturity badges, and links to working demos.
- Create a brand kit and reusable frontend components.
- Make Cellar Guard and BuildClinic the two clearest examples of the company promise.
- Standardize repo topics, descriptions, screenshots, contributor onboarding and live status.

**Done when:** a newcomer can understand the company and successfully try two tools in less than five minutes, without an account.

### Phase 2 — common evidence and workflows

- Specify a versioned report schema without forcing repositories to share code.
- Build a local-first “release readiness” view that accepts reports from Guard and BuildClinic.
- Add exportable CI annotations and reproducible sample fixtures.
- Validate security assumptions before introducing user accounts or central storage.

**Done when:** one sample release can produce a combined, traceable report with links back to each tool's evidence.

### Phase 3 — research tools

- Expand PlanCliff with realistic distributions and PostgreSQL plan capture.
- Expand CrashCheck with model-qualification evidence and replayable crash traces.
- Connect research findings to developer workflows only after measurements and limitations are reviewed.

**Done when:** benchmark datasets, seeds, scripts and results can be reproduced independently.

## Rules for deciding whether to add a new product

A proposal must identify a user, a measurable bottleneck, a real technical differentiator, a narrow demo, a trustworthy validation plan and who will maintain it. Reject generic dashboards or thin AI wrappers without a distinctive core.

## Brand boundary

- **Cellar** may continue as the name of the CSV checker in code, docs and deployment.
- **Cellar Studio** is the umbrella brand. Product and repository names remain unchanged unless their maintainers choose to migrate them.
- Existing project teams and external contributors retain credit.
- Product claims must match functioning code; label synthetic numbers and demonstrations.
