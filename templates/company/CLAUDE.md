# <Company Name>

Company-scoped guidance for **<Company Name>**, a sub-company of Team System.
This file is loaded *in addition to* the root [`CLAUDE.md`](../../CLAUDE.md) when
working inside `companies/<slug>/` — so put only **company-specific** guidance
here (group-wide rules already apply).

## What this company does

<One paragraph: the company's purpose, the kind of work it ships, who its
audience/clients are.>

## Scope layout

- `content/knowledge/` — <Company>'s settled reference (its own build + comms knowledge).
- `content/decisions/` — ADRs specific to <Company>.
- `content/brainstorms/` — <Company>'s in-progress thinking.
- `code/` — <Company>'s single project.
- `journal.md` — what each session changed for <Company>.

## Company-specific conventions

<Anything that differs from the group defaults — naming, clients, tone, stack.
Delete this section if there's nothing yet.>

## Closing the loop

Same rule as the group: at the end of a substantive session, fold learnings back
in (run `/session-close`) and log them in `journal.md`. Prefer this company's
scope unless the learning clearly applies group-wide.
