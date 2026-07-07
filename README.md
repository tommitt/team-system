# Team System

The shared brain for our **company of companies**. Team System is the group;
each sub-company has its own nested brain. Built to be used *with* Claude Code —
knowledge, decisions, thinking, and work all live here and **compound over time**.

## What's inside

| Path | What it is |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The operating manual — read this first. Explains scoping, the knowledge lifecycle, and the continuous loop. |
| [`group/`](group/) | Knowledge, decisions, and brainstorms shared across **all** companies. |
| [`companies/`](companies/) | One nested brain per sub-company. |
| [`templates/`](templates/) | Starting points for docs and for scaffolding a new company. |
| `.claude/skills/` | Reusable procedures Claude can run (`session-close`, `record-decision`, `new-company`). |

## Companies

| Company | What it does | Brain |
|---|---|---|
| **Dott. Comm.** | Communications & build work (first sub-company). | [`companies/dott-comm/`](companies/dott-comm/) |

_Add the next one with `/new-company`._

## The one habit that makes this work

End every substantive session by **closing the loop** — run `/session-close` so
what you learned lands back in the brain. See [`CLAUDE.md`](CLAUDE.md#the-continuous-loop).
