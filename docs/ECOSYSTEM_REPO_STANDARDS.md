# Cellar Studio — repository and product standards

## Recommended GitHub layout

Keep product repositories separate while they have independent release cycles:

- `Cellar` — existing Java CSV checker (do not break its current CI or URLs).
- `buildclinic` — browser-only build log checker (keep logs local by design).
- `ClauseCraft` — document analysis; maintain clear non-legal-advice limits.
- `systems-bottleneck-lab` — experiments, benchmarks and reproducible datasets.
- `PQL` and `PQL-Storage` — crash-consistency research; preserve their history and contributors.
- The Studio directory currently lives in `Cellar/deploy/pages/studio.html`; a dedicated `cellar-studio-hub` repository is optional if independent deployment becomes useful.

## Every product README should answer

1. The exact problem and intended user.
2. A reproducible 60-second demo.
3. What is implemented versus planned.
4. Prerequisites and run/test commands.
5. What data leaves the device or is retained.
6. Current limitations, security guidance and contribution instructions.
7. A real release/deployment link when one exists.

## Quality requirements

- Tests on pull requests; protect the default branch only after workflows are reliable.
- Lint, build, unit tests and targeted smoke checks for product-specific critical flows.
- No API keys in frontend code, committed datasets or example logs.
- No synthetic benchmark presented as production performance.
- Reduced-motion support, keyboard navigation and accessible contrast.
- No renaming, deletion, archiving or migration of another project without maintainer review.

## Release readiness checklist

- [ ] Demo uses the current implementation, not placeholders
- [ ] Build and tests pass on a clean checkout
- [ ] Documentation matches the supported environment
- [ ] Security and data-retention boundaries are clear
- [ ] API errors are useful and do not leak secrets
- [ ] Responsive layout checked at mobile and desktop sizes
- [ ] A maintainer and a next milestone are named
