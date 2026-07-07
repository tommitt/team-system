---
name: session-close
description: Close out a substantive Claude Code session by folding what was learned back into the company brain — update the relevant knowledge doc, CLAUDE.md, or skill, record any decisions, and append a journal entry. Use at the end of an important session, or when the user says "wrap up", "close out", "capture what we learned", "update the brain", or "session done".
---

# Session close-out — the continuous loop

Fold this session's durable learnings back into the brain so the next session
starts smarter. This is how the brain compounds; it's the whole point of the repo.

## When it's worth doing

Run this when the session produced something durable: a decision, a new/changed
convention, a reusable procedure, a corrected assumption, or new reference-worthy
facts. Skip trivial sessions — one-off questions, or pure code edits that taught
us nothing new.

## Determine the scope

Which brain does each learning belong to?
- Specific to one sub-company → that company: `companies/<name>/`.
- Applies across the group → `group/`.
When in doubt, prefer the narrower company scope; promote to the group later if it
recurs across companies.

## Steps

1. **Review the session.** List the durable learnings; separate them from one-off
   noise.
2. **Route each learning to its home:**
   - A choice with rationale → new ADR in `<scope>/content/decisions/` (use
     `/record-decision`).
   - A changed or new fact/convention → edit the relevant doc in
     `<scope>/content/knowledge/`; bump `updated:`; mark anything it replaces
     `status: superseded` with a forward link.
   - A new repeatable procedure → a new skill under `.claude/skills/` (or update
     an existing one).
   - A change to how Claude should operate in a scope → edit that scope's
     `CLAUDE.md`.
   - Still exploratory, nothing settled → `<scope>/content/brainstorms/`.
3. **Append a journal entry** to `<scope>/journal.md` (newest first): today's date,
   what was done, what changed (with links), and follow-ups.
4. **Report** a concise list of every file you created or changed, so the user can
   review before committing. Do not commit unless asked.

## Principles

- Prefer updating an existing doc over creating a near-duplicate.
- Keep `content/knowledge/` current and deduplicated — the brain should get sharper, not
  just bigger.
- Only capture what actually happened this session; never invent facts.
- Leave secrets and client-confidential material out of the repo.
- If several scopes are affected, close each one's loop and log to each journal.
