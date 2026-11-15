# Pilot and operating templates

Copy into your own tracker and complete with the pilot owner. These are workflow worksheets, not legal agreements.

## Discovery record

- Interview date / contact / role:
- Agency, team size, export/import workflow:
- Most recent real incident and date:
- What changed / who was affected:
- Discovery and repair time (customer estimate):
- Current checks and why they missed it:
- Number of exports / downstream consumers:
- Synthetic exporter available? Owner?
- Buyer / budget / decision timeline:
- Evidence supporting the idea:
- Evidence against the idea:
- Agreed next action and date:

## Integration inventory

| Export | Consumer ID | Owner | Required columns | Value/unit requirements | Positional? | Fixture variant | Coverage gap |
|---|---|---|---|---|---|---|---|
| sales.csv | inventory-report | To confirm | order_id, sku | Nonempty IDs | No | Standard | Returns variant not covered |

## Thirty-day pilot scope

- Pilot owner and developer:
- Repository / exporter / branch:
- Included consumers (maximum agreed):
- Data boundary: synthetic only; no raw client data collected:
- Setup date / review dates / closeout date:
- Advisory period and enforcement decision owner:
- Support hours, channel and response expectation:
- Pilot fee hypothesis and buyer confirmation:
- Success measures:
- Out of scope:
- Stop/rollback procedure:

## Acceptance checklist

- [ ] Fixture comes from the real exporter, not a manually maintained replacement.
- [ ] Requirements confirmed by consumer owner.
- [ ] Expected good fixture passes.
- [ ] Agreed breaking rename fails only affected consumers.
- [ ] Relevant value error fails at the expected record.
- [ ] No CSV cell values in reports or saved history.
- [ ] Invalid fixture generation stops CI before checking.
- [ ] Required check and owner review configured if enforcement is approved.
- [ ] Owner understands a pass covers only declared fixture requirements.
- [ ] Rollback and support expectations agreed.

## Planned breaking-change record

- Change / business reason:
- Current and replacement column or format:
- Consumers and owners affected:
- Compatibility window (publish both formats):
- Consumer migration test evidence:
- Approval recorded in PR:
- Contract revision and release:
- Removal date after confirmation:
- Rollback action and responsible owner:

## Incident worksheet

- Detection time / affected export / severity:
- Contract hash / commit / exporter version:
- Expected result / observed result:
- Synthetic reproduction:
- Was the consumer covered? Was fixture representative?
- Immediate recovery:
- Root cause:
- Fix / owner / deadline:
- Regression test and contract update:
- Customer communication status:

## Pilot closeout

| Metric | Baseline | Final | Evidence |
|---|---|---|---|
| Setup minutes | | | |
| Consumers covered / known | | | |
| Confirmed breaks detected | | | |
| Findings dismissed / reviewed | | | |
| Founder support hours | | | |
| Enabled at day 30 | | | |
| Paid extension or budgeted commitment | | | |

Decision: continue / adjust / pause. Why? What evidence would change the decision? Who owns the next step and by when?
