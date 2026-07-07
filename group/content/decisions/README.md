# Group decisions

Architecture Decision Records (ADRs) for choices that affect the **whole group**.
Company-specific decisions live in `companies/<name>/content/decisions/` instead.

- Numbered `NNNN-short-title.md`, newest number wins.
- Immutable once `accepted` — to change one, write a new ADR that supersedes it
  and update the old one's `status` + a forward link.
- Create one with `/record-decision` or from [`templates/decision.md`](../../../templates/decision.md).

## Log

| # | Decision | Status |
|---|---|---|
| [0000](0000-record-decisions-as-adrs.md) | Record decisions as ADRs | accepted |
| [0001](0001-company-of-companies-structure.md) | Company-of-companies repo structure | accepted |
