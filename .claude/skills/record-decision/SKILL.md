---
name: record-decision
description: Capture a settled decision as a numbered ADR in the right scope's decisions/ folder. Use when the team has agreed on an architectural, product, comms, or process choice and wants it recorded — triggers include "record this decision", "write an ADR", "capture what we decided", "log this choice".
---

# Record a decision

Turn a resolved discussion into a durable, dated Architecture Decision Record.

## Steps

1. **Pick the scope.** Group-wide → `group/content/decisions/`; specific to one company →
   `companies/<name>/content/decisions/`. Prefer the narrower scope when unsure.
2. **Next number.** List that folder, find the highest `NNNN-` prefix, add 1, and
   zero-pad to 4 digits (`0007`).
3. **Draft from the template** [`templates/decision.md`](../../../templates/decision.md).
   Fill in: title, today's date, `status: accepted` (or `proposed` if not final),
   deciders, the context that forced the choice, the decision itself, alternatives
   considered, and consequences.
4. **Save** as `<scope>/content/decisions/NNNN-kebab-title.md`.
5. **Propagate.** If the decision changes current reality, update the affected
   `content/knowledge/` doc(s), and mark anything it replaces `status: superseded` with a
   forward link. Add the ADR to the `## Log` table in that `content/decisions/README.md`.
6. **Report** what you recorded and which knowledge docs need follow-up.

## Notes

- ADRs are immutable once `accepted`. To change one, write a new ADR that
  supersedes it; set the old one's `superseded-by` and `status: superseded`.
- Keep it short — a good ADR fits on one screen.
- This is often invoked as a step inside `/session-close`.
