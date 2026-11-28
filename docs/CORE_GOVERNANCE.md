# Cellar Studio — core governance and Cellar Guard ownership

This document defines **decision ownership**, not access control. The Cellar GitHub repository is public. Anyone can read this file, and the `.github/CODEOWNERS` file requests reviews but does **not** enforce authorization unless appropriate GitHub branch rules are enabled.

## Core decision-makers

| GitHub user | Core responsibility | Scope |
| --- | --- | --- |
| [Suryandu Ganguly (`@suryandugy-glitch`)](https://github.com/suryandugy-glitch) | Founder & CTO | Technology direction, brand, product approval, release decisions |
| [Gunjan Roy (`@roy-gunjan743`)](https://github.com/roy-gunjan743) | Backend | Backend architecture, reliability, technical delivery and engineering standards |

**These two users are named for repository-level technical governance.** This is not the full company team or a claim that other collaborators have lost their GitHub permissions. Gunjan's previously documented repository access should be verified in GitHub settings when permissions matter.

## Public team roles

| Team member | Cellar Studio role |
| --- | --- |
| Suryandu Ganguly | Founder & CTO |
| Gunjan Roy | Backend |
| Disha Chakraborty | CEO |
| Debangana Debnath | Operation Coordinator |

Other contributors also support work behind the scenes; publish names and responsibilities when the team provides them. These are public project-team labels and do not independently establish legal officer appointments or GitHub privileges.

## Repository ownership

**`Cellar-Studio` is the main repository for Cellar Studio and its only published product, Cellar Guard.** The Java source, product manual, static website and pull-request checker live together here.

## Company structure

```text
Cellar Studio — company and Java product
│
├── Technical repository governance (Suryandu + Gunjan)
│   ├── Brand and Cellar Guard product direction
│   ├── Architecture and security standards
│   ├── Release readiness and roadmap
│   └── Collaboration and access policy
│
├── Studio operations (Disha + Debangana + contributors)
│   ├── Company coordination
│   └── Day-to-day operations
│
├── Cellar Guard (working Java pilot)
│   ├── CLI contract validation and release gates
│   ├── Local web workspace and API
│   ├── Pull-request CI and test fixtures
│   └── Product manual and documentation
│
└── Studio HQ (static public website)
    ├── Guard product demonstration
    ├── Java setup and manual
    └── Company information and legal policies
```

Separate repositories, if any, keep their own licensing obligations and existing contributors. They are not advertised as Cellar Studio products.

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
