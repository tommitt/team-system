# Dott. Comm.

Company-scoped guidance for **Dott. Comm.**, the first sub-company of Team System.
This file is loaded *in addition to* the root [`CLAUDE.md`](../../CLAUDE.md) when
working inside `companies/dott-comm/` — so put only **company-specific** guidance
here (the group-wide rules already apply).

## What this company does

**Dott. Comm.** (from *Dottore Commercialista*, the Italian chartered accountant)
is building an **MCP server** — a suite of tools and skills to automate the work
of accountants' practices in Italy. As of mid-2026 it's in the **problem-
exploration** phase: mapping which studio tasks are most manual/repetitive and
which are tractable with AI, before committing to what to build first.

## Scope layout

- `content/knowledge/` — Dott. Comm.'s settled reference (its own build + comms knowledge).
- `content/decisions/` — ADRs specific to Dott. Comm.
- `content/brainstorms/` — Dott. Comm.'s in-progress thinking.
- `code/` — the company's single project (the MCP server).
- `journal.md` — what each session changed for Dott. Comm.

## Company-specific conventions

- **It's the autonomous era.** Development is done by an autonomous software
  factory: planning docs must NOT estimate human build effort or "weeks of
  work". Prioritize and sequence by **external friction** instead — pilot
  access and validation, credentials/API access, partnerships, compliance —
  since build cost is ~zero and the whole backlog can be built in parallel.
- **Stack (MCP server).** The MCP server is a route handler inside the website's
  Next.js app (`code/`), deployed on Vercel in the same project; auth is OAuth
  2.1 with **self-hosted Better Auth** as the Authorization Server (in-process,
  tables in the same Supabase Postgres; magic-link sign-in only). See
  [ADR 0012](content/decisions/0012-mcp-auth-better-auth-self-hosted.md)
  (supersedes [ADR 0001](content/decisions/0001-mcp-in-nextjs-app-workos-auth.md))
  and [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md). Note: this Next.js
  (16.x) has breaking changes — read `code/AGENTS.md` and the bundled docs in
  `node_modules/next/dist/docs/` before writing app code.
- **Billing.** Identity in Better Auth (our own Postgres), money in Stripe,
  entitlement + usage in Supabase; free trial = tool-call count; new MCP tools MUST register through
  `registerGatedTool` (`code/src/lib/mcp/tools.ts`) so they're metered. See
  [ADR 0002](content/decisions/0002-billing-supabase-stripe-usage-trial.md) and
  [billing-setup.md](content/knowledge/billing-setup.md).

## Closing the loop

Same rule as the group: at the end of a substantive session, fold learnings back
in (run `/session-close`) and log them in `journal.md`. Prefer this company's
scope unless the learning clearly applies group-wide.
