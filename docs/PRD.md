# Product requirements

## Product statement

Cellar is a developer tool that explains which customer workflow a CSV export change can break before release. The first buyer hypothesis is a small software agency maintaining recurring imports/exports for several clients. The initial user is an integration developer; the likely budget owner is the engineering lead or agency owner. These are hypotheses from the supplied plan, not validated market findings.

## Jobs to be done

| Role | Job | Product outcome |
|---|---|---|
| Integration developer | Change an exporter without surprising consumers | Named failing integration and actionable rule/record |
| Agency lead | Understand who is affected before approving a release | Owner mapping, readable report and documented migration |
| Consumer owner | Make import expectations explicit | Versioned column/value contract |
| New team member | Learn why a CI export test exists | Contract descriptions, examples and ownership |

## Core user journey

1. Identify one recurring export and one developer who owns it.
2. Name the downstream consumers, their owners and real requirements.
3. Generate a synthetic fixture using the actual exporter.
4. Encode requirements, run locally, resolve false assumptions.
5. Add the CI check in advisory mode and observe findings.
6. Agree on blocking rules with the pilot owner, then enable a required repository check.
7. For intentional breaks, keep old and new columns until migration is confirmed; update contracts under review.

## Functional scope and acceptance

| Requirement | Acceptance criterion | Status |
|---|---|---|
| Core compatibility | Rename order_id→id fails inventory only | Implemented/tested |
| Exact headers | Extra/reordered columns pass by default; blanks/duplicates fail | Implemented/tested |
| Value validation | Wrong type, invalid enum, duplicate, missing or out-of-range value yields record-specific finding | Implemented/tested |
| Local desktop | CSV input, contract editor, results, report export, history and diff | Implemented; manual visual/OS acceptance pending |
| CLI gate | 0/1/2 exit semantics and machine-readable errors | Implemented/tested |
| Onboarding mode | Findings remain visible while advisory prevents blocking | Implemented/tested |
| History | Recent runs persist and do not retain CSV cell values | Implemented/tested |
| Config edits | Validate before saving; stale revision fails | Implemented/tested |
| CI | Real exporter step precedes checker; read-only repo permissions | Workflow provided; user must run it in GitHub |
| Local API | Auth, host/origin restriction and documented endpoints | Implemented/tested |
| Team approval | Owners must approve contract changes | Process/template only; app enforcement not implemented |
| Shared registry and billing | Multiple teams coordinate/pay centrally | Planned |

## Explicit non-goals for this release

Production data ingestion, a cloud dashboard, database connectors, real-time streaming, general-purpose data cleaning, fuzzy inference of business meanings, automatic migration, AI-generated pass/fail decisions, tenant management and payment processing.

## Proposed product metrics

Track per pilot, with permission and without collecting raw client CSVs:

- Time from installation to first successful real-exporter check; initial target under 30 minutes.
- Real consumers covered / known consumers; include undocumented ones in the denominator.
- Confirmed incompatible changes detected, from a reproduced historical or agreed synthetic incident.
- Findings dismissed as irrelevant / all reviewed findings. Target below 10% after rules are agreed; small samples are not reliable estimates.
- Workflow enabled after 30 days; number of additional exports requested.
- Weekly founder onboarding/support time per team.
- Paid extension or signed budgeted commitment, not only compliments or demo views.

## Decision gate after the initial discovery cycle

Use the supplied plan's proposed thresholds: at least 3 of 10 interviewees describe a recent costly incident, 2 teams install on a real repository, and 1 team pays or signs a concrete commitment. If incidents are mainly value-format failures, focus the next rules on those incidents. If setup is slow, improve exporter fixture generation before adding more interfaces. If existing scripts are sufficient, pause expansion or investigate an adjacent recurring problem.

These thresholds guide a small experiment; they do not prove a large market. Record contradictory evidence and update the product scope.
