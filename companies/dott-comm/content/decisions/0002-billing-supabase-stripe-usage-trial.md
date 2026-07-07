---
title: Billing — Supabase for entitlement/usage, Stripe for money, usage-gated free trial
status: accepted
date: 2026-07-06
deciders: [ttassi]
supersedes:
superseded-by:
tags: [mcp, billing, stripe, supabase, workos, paywall, free-trial]
---

# 0002. Billing — Supabase for entitlement/usage, Stripe for money, usage-gated free trial

## Context

The MCP server ([ADR 0001](0001-mcp-in-nextjs-app-workos-auth.md)) authenticates
every request via WorkOS AuthKit: the JWT `sub` is a stable per-user id. The MCP
is the product and must carry the paywall: users install it, authenticate, use it
freely until a limit, then pay. That requires three kinds of state — identity,
money, and request-time entitlement (plan + usage counter) — and a decision on
where each lives. Vercel route handlers are stateless, so the usage counter needs
external storage.

## Decision

1. **Three systems, one job each.** Identity stays in **WorkOS** (JWT `sub`),
   money lives in **Stripe** (products/prices, Checkout, Customer Portal,
   webhooks), and entitlement at request time lives in **Supabase Postgres**
   (`users_billing` table: WorkOS-user ↔ Stripe-customer mapping, cached plan,
   usage counter).
2. **Free trial gated by tool-call count** — general MCP consumption (tools and
   skills alike), not time. Default **50 calls**, configurable via
   `TRIAL_TOOL_CALL_LIMIT`. Usage is incremented atomically in Supabase on every
   gated call.
3. **Paid plan: single flat monthly Stripe subscription, unlimited usage.**
   Usage is still recorded while active, so caps/tiers can be added later
   without re-instrumenting.
4. **Entitlement is read from the DB on the request path**, not from JWT
   claims: a Stripe webhook flips the plan in Supabase and the very next tool
   call is unblocked — no access-token-refresh staleness (~5 min) in either
   direction.
5. **Blocked calls answer in-band**: the tool call succeeds at the protocol
   level and returns an Italian upgrade message with a link to the website's
   `/upgrade` page — never a 401/403, which MCP clients treat as broken auth.
   The gate also warns inside responses from 80% of the trial.
6. **Fail closed**: if Supabase is unreachable, the gate blocks with a friendly
   temporary-error message rather than serving unmetered calls — same posture
   as the auth layer's misconfiguration handling.
7. **Payment leg on the website**: `/upgrade` signs the user in with the *same*
   AuthKit environment (identity link), lazily creates the Stripe customer with
   `metadata.workos_user_id`, and redirects to Stripe Checkout.

## Alternatives considered

- **No database — time-based trial via WorkOS metadata + JWT claims.** Works
  only for time-based trials; a usage-based limit needs a per-call counter, and
  claim staleness delays both unblocking after payment and enforcement after
  cancellation. Rejected: the trial is usage-based by product choice (value is
  delivered per tool call, not per day of access).
- **Neon Postgres.** Equally viable serverless Postgres; user chose Supabase.
- **Redis/Upstash-only counters.** Classic rate-limit answer, but running a
  second store before the first paying user is premature; Postgres handles this
  scale. Revisit only if counter writes become a hot path.
- **Stripe Billing Meters for gating.** Meters *price* usage, they don't
  *block* it; querying Stripe on the request path is slow and rate-limited.
  Gate from our DB; push usage events to Stripe only if a per-use plan appears.

## Consequences

- **Positive:** upgrade takes effect on the next tool call after checkout; one
  indexed read + atomic increment per call; the product's inevitable database
  (studio data, job state) now exists; Stripe holds all card data and dunning.
- **Trade-offs / negative:** a DB round trip on every gated tool call (fine at
  current scale); Supabase becomes a hard runtime dependency of the MCP (fail
  closed means a Supabase outage blocks tools).
- **Follow-ups:**
  - Add paid usage caps/tiers if pricing evolves (the gate's decision function
    is pluggable by design).
  - Tune the 80% warning threshold when conversion data exists.
  - Push usage events to Stripe Meters if a per-use plan is introduced.
