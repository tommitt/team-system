# Team System — the group brain

This repository is our **company of companies**. Team System is the group; each
sub-company (starting with **Dott. Comm.**) has its own brain nested inside it.
This repo is the single shared place where people and Claude Code keep durable
knowledge, decisions, in-progress thinking, reusable procedures, and the work we
ship — across **software (build)** and **communications (comms)**.

If you are Claude, read this file first. It defines where things live, how the
brain is scoped, and — most importantly — how the brain **compounds** over time.

## The two rules that matter most

1. **Scope everything.** Ask: is this true for the whole group, or just one
   company? Group-wide → `group/`. Company-specific → `companies/<name>/`.
   When unsure, prefer the narrower company scope; promote to group later if it
   recurs.
2. **Close the loop.** At the end of any substantive session, fold what was
   learned back into the brain (see *The continuous loop* below). A session that
   taught us something and left no trace is a bug.

## Repository map

```
team-system/
├── CLAUDE.md          ← you are here: group manual + the loop
├── group/             ← shared across ALL companies
├── companies/         ← one nested brain per sub-company (e.g. dott-comm)
├── templates/         ← starting points for docs and new companies
└── .claude/skills/    ← reusable procedures Claude can run
```

Every scope — the `group/` and each `companies/<name>/` — uses the **same
two-part layout**: a `content/` half (the brain) and a `code/` half (the work).

```
<scope>/
├── CLAUDE.md          scope manual (companies + group)
├── journal.md         append-only log of what each session changed — the loop's trace
├── content/           ← the brain
│   ├── knowledge/     settled reference — current truth (✅ keep current)
│   ├── decisions/     ADRs — what we chose & why (✅ immutable log)
│   └── brainstorms/   raw exploration, proposals, WIP (❌ not yet decided)
└── code/              ← the work: the scope's single project (stay flexible)
```

We keep **one project per scope**, so `code/` *is* that project (not a folder of
projects). `journal.md` sits at the scope root because it logs changes to **both**
halves.

## Hierarchical context

`CLAUDE.md` files load from the repo root down to your working directory. So when
you work inside `companies/dott-comm/`, you automatically get **this** group
manual **plus** `companies/dott-comm/CLAUDE.md`. Keep group-wide guidance here;
keep company-specific guidance in that company's `CLAUDE.md`.

## The knowledge lifecycle

Ideas flow one direction. The stage tells you the folder:

1. **Brainstorm** → `<scope>/content/brainstorms/`. An idea, problem, or proposal.
   Messy is fine. Nothing here is binding.
2. **Decide** → `<scope>/content/decisions/`. When a brainstorm resolves into a
   choice, record it as a numbered ADR. Dated and permanent — we don't rewrite
   history, we **supersede**.
3. **Document** → `<scope>/content/knowledge/`. Fold the consequences into the
   living reference so the team can rely on it without re-reading the whole history.

## The continuous loop

The brain must get **sharper** every session, not just bigger. This is the point
of the whole repo.

**At the end of any substantive session, close the loop.** Run `/session-close`
(the skill) or do it inline. For each durable learning, route it to its home:

- A choice with rationale → new ADR (`/record-decision`).
- A changed fact or convention → edit the relevant `content/knowledge/` doc; bump
  its `updated:` date; mark anything it replaces `superseded`.
- A new repeatable procedure → a new/updated skill in `.claude/skills/`.
- A change to how Claude should work in a scope → edit that scope's `CLAUDE.md`.
- Still exploratory → `content/brainstorms/`.

Then append a dated entry to the relevant `<scope>/journal.md` and report every
file you touched so the user can review before committing.

**What counts as "substantive"?** It produced something durable: a decision, a
new/changed convention, a reusable procedure, a corrected assumption, or new
reference-worthy facts. Skip one-off questions and pure code edits that taught us
nothing new.

## Conventions

- **Markdown, one topic per file.** File names are `kebab-case.md`; ADRs are
  numbered `NNNN-short-title.md`.
- **Frontmatter** on knowledge & brainstorm docs (`title`, `status`, `owner`,
  `updated`, `tags`); see `templates/`.
- **Dates are absolute** (`YYYY-MM-DD`), never "last week".
- **Link liberally** between docs with relative links.
- **Every knowledge doc names an owner** and a `status` (`active` / `draft` /
  `superseded`).
- **No secrets in the repo.** Credentials, client-confidential material, and keys
  stay out (see `.gitignore`).

## Working here (for Claude)

- Route new docs by lifecycle stage **and** scope. Default reference → the right
  `content/knowledge/` subfolder; proposals → `content/brainstorms/`; code → the
  scope's `code/`.
- Prefer updating an existing doc over creating a near-duplicate.
- Keep `content/knowledge/` current and deduplicated when a decision changes reality.
- Match the naming and structure of neighboring files.
- Adding a new sub-company? Use `/new-company`.
