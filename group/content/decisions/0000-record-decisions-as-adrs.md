---
title: Record decisions as ADRs
status: accepted
date: 2026-07-06
deciders: [tommitt]
supersedes:
superseded-by:
tags: [meta, process]
---

# 0000. Record decisions as ADRs

## Context

This repo is a shared brain used by both people and Claude Code. We need a
durable, low-friction record of *why* things are the way they are — not just the
current state. Reference docs in `knowledge/` tell you what is true now, but they
get rewritten and lose the reasoning and history behind each choice.

## Decision

We record significant choices — architecture, product, comms, and process — as
numbered **Architecture Decision Records (ADRs)**, one file per decision, in the
`content/decisions/` folder of the relevant scope (`group/` or a company). We use
[`templates/decision.md`](../../../templates/decision.md). ADRs are immutable once
`accepted`; to change one we write a new ADR that **supersedes** it.

## Alternatives considered

- **Keep rationale inside knowledge docs** — rejected: mixes living reference with
  historical reasoning, and the reasoning gets overwritten on every edit.
- **A single CHANGELOG** — rejected: doesn't hold context and alternatives per
  decision, and doesn't scope cleanly across companies.

## Consequences

- Positive: durable, searchable rationale; Claude can capture decisions
  consistently via `/record-decision`.
- Trade-off: a small discipline cost to write one — kept minimal by the template.
- Follow-up: link from relevant `knowledge/` docs back to the ADRs that shaped them.
