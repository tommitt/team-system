---
title: Billing web UX — standalone /account, /upgrade as auto-forwarding paywall dispatcher
status: accepted
date: 2026-07-08
deciders: [ttassi]
supersedes:
superseded-by:
tags: [billing, stripe, ux, nextjs, paywall, auth, web]
---

# 0013. Billing web UX: standalone /account, /upgrade auto-forwards to Stripe

## Context

After the Better Auth cutover ([ADR 0012](0012-mcp-auth-better-auth-self-hosted.md))
the site had two nearly identical billing pages and no way in: `/account` and
`/upgrade` showed the same plan/usage card, `/account` sent subscribers-to-be on a
detour through `/upgrade` (an extra click to reach Stripe Checkout), nothing in
the site nav linked to either page, and there was no sign-out anywhere.

## Decision

Give each surface one job:

1. **Nav entry point** — a static outline **"Accedi"** button in `SiteNav`, far
   right, always linking to `/account`. No session logic in the nav: the proxy
   already bounces signed-out visitors to `/sign-in?returnTo=/account`, and a
   plain link keeps the landing page fully static/cacheable. We accept that a
   signed-in user sees "Accedi" instead of "Account".
2. **`/account` is the standalone signed-in home** — plan badge, phase-aware
   usage bar (shared `trialUsageView()` in `gate.ts`), **direct** Stripe actions
   (`startCheckout` or "Gestisci abbonamento su Stripe" → portal; no detour via
   `/upgrade`), and a **"Disconnetti"** sign-out ("Esci" read like "back to
   home").
3. **`/upgrade` is the paywall dispatcher** — its audience is high-intent
   paywall-link clicks (`/upgrade?t=…`), so when identity resolves and the plan
   is payable it **auto-forwards to Stripe Checkout** instead of asking for one
   more click. Checkout *is* the review step (price, recurrence). The page still
   renders normally for every other state (signed-out, expired token, active,
   past_due, Stripe unconfigured) — it cannot be deleted, only bypassed.
4. **`past_due` routes to the customer portal, never to a new checkout** — the
   subscription exists; a second checkout risks a double subscription. The fix
   (update the card) lives in the portal, which stays behind a full sign-in.

## Guardrails (why the auto-forward is shaped this way)

- **Client-side, not a 302**: paywall URLs get pasted into chats/email and
  link-preview bots GET them. A GET must never create Stripe sessions/customers,
  so the forward is a tiny `AutoSubmit` client component that `requestSubmit()`s
  the existing checkout form on mount — bots don't run JS, browsers do, and the
  button remains as a no-JS fallback.
- **`cancel_url` is `/upgrade?canceled=1` (+ the token when present)**: backing
  out of Stripe must not land on a page that auto-forwards straight back in
  (redirect loop); `?canceled=1` disables the forward, and the carried token
  keeps the plan view instead of a sign-in prompt.

## Consequences

- One-click (zero-click from the paywall) path to payment; `/account` is
  discoverable from the landing page and self-sufficient.
- The `/upgrade` interstitial no longer acts as a "which account am I paying
  for?" checkpoint — acceptable today (the token flow never displayed an email
  anyway); revisit if shared machines / multi-account studios become real.
- Trial-usage presentation logic lives once in `trialUsageView()`
  (`src/lib/billing/gate.ts`), unit-tested, used by both pages.
