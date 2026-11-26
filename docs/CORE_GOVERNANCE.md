# Cellar Studio — core governance and product structure

This document defines **decision ownership**, not access control. The Cellar GitHub repository is public. Anyone can read this file, and the `.github/CODEOWNERS` file requests reviews but does **not** enforce authorization unless appropriate GitHub branch rules are enabled.

## Core decision-makers

| GitHub user | Core responsibility | Scope |
| --- | --- | --- |
| [Suryandu Ganguly (`@suryandugy-glitch`)](https://github.com/suryandugy-glitch) | Founder / platform lead | Company direction, brand, product approval, release decisions |
| [Gunjan Roy (`@roy-gunjan743`)](https://github.com/roy-gunjan743) | Core engineering lead | Architecture review, reliability, technical delivery and engineering standards |

**Only these two users are named as the current Cellar Studio core team.** This is a governance designation, not a claim that other collaborators have lost their GitHub permissions. Gunjan currently has write access to this repository as of this documentation update.

## Repository ownership

**Cellar Studio is the main company repository (`Cellar-Studio`); Cellar Guard is currently a product codebase within it, intended for a separate child repository later.** See the [repository hierarchy plan](REPOSITORY_HIERARCHY.md). Listing a product under Studio does not transfer its repository permissions.

## Company structure

```text
Cellar Studio — company and main developer platform
│
├── Core governance (Suryandu + Gunjan)
│   ├── Brand and product portfolio
│   ├── Architecture and security standards
│   ├── Release readiness and roadmap
│   └── Collaboration and access policy
│
├── Products
│   ├── Cellar Guard — CSV compatibility checker (working pilot)
│   ├── BuildClinic — build-log diagnostics (standalone tool)
│   └── ClauseCraft — document-pattern review (prototype)
│
├── Studio Labs
│   ├── PlanCliff — query-plan regression research
│   └── CrashCheck — storage crash-consistency research
│
└── Shared platform (planned, not yet deployed)
    ├── Project registry and cross-product navigation
    ├── Versioned findings/reports
    ├── Team roles and access control
    └── Auditable release decisions
```

Each project retains its own repository, licensing obligations and existing contributors. A product's listing here does not transfer ownership or give Studio access to its credentials.

## Decisions reserved for the core team

- Renaming the Cellar Studio brand, adding/removing official products, or changing the company positioning.
- Approving shared authentication, secrets handling, data retention and product-to-product data flows.
- Approving incompatible public API changes and a product's promotion to production-ready.
- Setting core team membership and access policy. Adding a new core member requires explicit agreement from the existing core.

Other contributors can still propose features, fix bugs, run tests and open pull requests according to their existing GitHub permissions. Keep technical reviews open and credit contributors accurately.

## Pull-request process

1. Open an issue describing the problem, target product, expected behavior, tests, privacy impact and rollout.
2. For changes to the core files listed in [CODEOWNERS](../.github/CODEOWNERS), request review by Suryandu and Gunjan.
3. Run the existing CI checks. Use synthetic data and document known limits.
4. Merge only after the designated reviewer approves **and** required checks pass. A written agreement is process policy; enforcement depends on GitHub repository rules.
5. Record significant decisions in an issue or pull request so they remain auditable.

## Access-control boundary

**Do not put secrets, private plans, employee information, financial details or internal credentials here.** Public repositories have no per-file privacy.

If the governance workspace must be visible only to Suryandu and Gunjan:

1. Create a **private** GitHub repository such as `cellar-studio-core`.
2. Grant access only to `suryandugy-glitch` and `roy-gunjan743` and verify the collaborator list.
3. Keep its visibility private, restrict repository invitations, and protect its default branch with required review and status checks.
4. Store confidential internal operating documents **only there**. Publish a sanitized product roadmap in this public repo.

The current GitHub connection does not offer a verified repository-creation or collaborator-administration action. **This document and CODEOWNERS do not create the private repository or revoke any existing user's access.**
