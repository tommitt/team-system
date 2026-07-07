---
title: Company-of-companies repo structure
status: accepted
date: 2026-07-06
deciders: [tommitt]
supersedes:
superseded-by:
tags: [meta, structure, knowledge-management]
---

# 0001. Company-of-companies repo structure

## Context

Team System is a group that will hold multiple sub-companies over time, starting
with Dott. Comm. Knowledge is mostly company-specific but some is shared across
the group. We also want the brain to **compound**: each substantive Claude Code
session should leave the knowledge base sharper than it found it.

## Decision

1. **Scoped, two-part layout.** The group (`group/`) and each company
   (`companies/<name>/`) share the *same* internal layout: a `content/` half
   (the brain — `knowledge/`, `decisions/`, `brainstorms/`) and a `code/` half
   (the scope's single project). `CLAUDE.md` and `journal.md` sit at the scope
   root. We keep one project per scope, so `code/` *is* that project.
2. **Hierarchical `CLAUDE.md`.** The root `CLAUDE.md` holds group-wide guidance;
   each company has its own `CLAUDE.md`. Claude Code loads them top-down, so
   working inside a company yields group + company context automatically.
3. **Knowledge lifecycle.** Ideas flow `brainstorms/` → `decisions/` →
   `knowledge/`.
4. **The continuous loop.** At the end of substantive sessions, learnings are
   folded back into the right artifact (knowledge doc, `CLAUDE.md`, or skill) and
   logged in `journal.md`. Operationalized by the `session-close` skill and
   reinforced as a default in the root `CLAUDE.md`.
5. **New companies** are scaffolded from `templates/company/` via `/new-company`.

## Alternatives considered

- **One flat brain, no company scoping** — rejected: knowledge from different
  companies would collide; doesn't match the group model.
- **Separate repo per company** — rejected: loses shared group knowledge and a
  single place to work; harder to promote learnings across companies.
- **Loop as an optional habit only** — rejected: without structural support
  (skill + journal + CLAUDE.md default) it wouldn't actually happen.

## Consequences

- Positive: clean scoping, automatic context inheritance, an auditable trace of
  how the brain evolves, and a one-command path to add companies.
- Trade-off: a bit of folder ceremony and empty scaffolding up front.
- Follow-up: revisit whether per-company skills need their own namespacing if the
  number of companies grows.
