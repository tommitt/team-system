---
name: new-company
description: Scaffold a new sub-company brain under companies/ from the standard template. Use when adding a new company, brand, or entity to the group — triggers include "add a new company", "set up a sub-company", "onboard <name> into the group", "create a new brain for <name>".
---

# Scaffold a new sub-company

Create a new company brain with the standard, group-consistent layout.

## Steps

1. **Get the name.** Ask for the company's display name if not given; derive a
   `kebab-case` slug (e.g. "Dott. Comm." → `dott-comm`). Confirm the slug isn't
   already taken under `companies/`.
2. **Copy the scaffold.** Recreate `templates/company/` at `companies/<slug>/`,
   including `CLAUDE.md`, `journal.md`, the `content/` half (`knowledge/`,
   `decisions/`, `brainstorms/`), and the `code/` half — each with its README.
3. **Fill `companies/<slug>/CLAUDE.md`:** replace every `<Company Name>` / `<slug>`
   placeholder; write the "what this company does" paragraph and any
   company-specific conventions.
4. **Seed `companies/<slug>/journal.md`** with a first entry dated today noting the
   company was created (replace the placeholder date).
5. **Register it** in the root [`README.md`](../../../README.md) "Companies" table.
6. **Report** the created structure and anything the user should fill in next.

## Notes

- Keep the layout identical across companies — the consistency is what lets Claude
  and people move between brains without re-learning the structure.
- Company-specific runnable skills can live in `.claude/skills/` namespaced by the
  company slug if needed; shared skills stay un-prefixed.
