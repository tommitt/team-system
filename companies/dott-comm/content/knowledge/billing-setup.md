---
title: MCP billing — Supabase free-trial gate + Stripe (for developers)
status: active
owner: ttassi
updated: 2026-07-08
tags: [mcp, billing, stripe, supabase, better-auth, paywall, engineering, runbook]
---

# MCP billing — free-trial gate + Stripe (for developers)

How the Dott. Comm. MCP meters usage, enforces the free trial, and takes
payment. Decision context: [ADR 0002](../decisions/0002-billing-supabase-stripe-usage-trial.md).
Auth (the layer under this): [mcp-auth-setup.md](./mcp-auth-setup.md).
Setting up from scratch? Follow the ordered checklist in
[dev-setup-guide.md](./dev-setup-guide.md) — this doc is the billing deep dive.

## How it works

Identity lives in **Better Auth** (the `user_id` — self-hosted in our own
Postgres, see [ADR 0012](../decisions/0012-mcp-auth-better-auth-self-hosted.md)),
money in **Stripe**, request-time entitlement (plan + usage counter) in
**Supabase Postgres**.

```
tool call ──▶ registerGatedTool (lib/mcp/tools.ts)
                └─▶ checkAndRecordUsage(userId)          one RPC round trip
                      └─▶ Supabase increment_usage()     atomic upsert+increment
                            returns { usage_count, plan }
              allowed → run tool (± trial warning appended)
              blocked → normal tool result with upgrade message (never 401/403)

pay ──▶ /upgrade?t=… (paywall link) ──▶ AUTO-forwards to Stripe Checkout
        /account (nav "Accedi" → signed-in home) ──▶ checkout / portal directly
Stripe webhook ──▶ /api/stripe/webhook ──▶ flips plan in Supabase
              → the user's NEXT tool call is unblocked (no token refresh)
```

Web-surface roles (see [ADR 0013](../decisions/0013-billing-web-ux-account-standalone-upgrade-dispatcher.md)):
**`/account`** is the standalone signed-in home (plan, phase-aware usage bar,
direct `startCheckout` or portal, "Disconnetti" sign-out; reachable from the nav
"Accedi" button — a static link, the proxy handles the signed-out bounce).
**`/upgrade`** is the paywall dispatcher: with a resolvable identity and a
payable plan it auto-submits the checkout form on mount (client-side
`AutoSubmit`, so link-preview bots that don't run JS can never create Stripe
sessions on GET); `?canceled=1` (the `cancel_url`) disables the forward to avoid
a redirect loop. `past_due` is routed to the **portal**, never to a new checkout
(double-subscription risk).

Free trial = **50 upfront calls, then 20/day** — the first `TRIAL_TOOL_CALL_LIMIT`
(default 50) tool calls are a lifetime pool usable at any pace; once spent, the
user drops to a recurring daily allowance of `DAILY_TOOL_CALL_LIMIT` (default 20)
calls that refills at **midnight Europe/Rome**. A warning is appended to results
from 80% of whichever cap is active; the daily block message is "come back
tomorrow or upgrade". Paid plan = flat monthly Stripe subscription, unlimited
(usage still recorded). **Fail closed**: Supabase unreachable → the call is
blocked with a friendly Italian message, never served unmetered.

## Relevant code (`companies/dott-comm/code/`)

- `supabase/schemas/01_billing.sql` — **declarative source of truth** for the
  `users_billing` table (RLS on, zero policies → service-role only) + the current
  `increment_usage()` RPC. Migrations are derived from it via `npm run db:diff`;
  see [db-schema-migrations.md](./db-schema-migrations.md).
- `supabase/migrations/*.sql` — derived history: `users_billing` +
  `increment_usage` (00001), the daily-usage rework (00002), then the
  `workos_user_id` → `user_id` rename in 00004 (Better Auth cutover, ADR 0012).
  Applied, not hand-edited.
- `src/lib/billing/database.types.ts` — generated schema types (`npm run db:types`).
- `src/lib/billing/supabase.ts` — typed service-role client singleton (`server-only`).
- `src/lib/billing/gate.ts` — `checkAndRecordUsage`, pure `decide()` behavior
  matrix, `getBillingRow`.
- `src/lib/billing/store.ts` — write helpers shared by checkout actions + webhook
  (idempotent, safe under Stripe retries).
- `src/lib/mcp/tools.ts` — `registerGatedTool` wrapper; register every tool
  through it.
- `src/proxy.ts` — optimistic Better Auth session-cookie guard for `/account`
  (Next 16 renamed middleware → proxy). `/upgrade` is public (renders its own
  sign-in CTA); server components re-validate with `auth.api.getSession`.
- `src/app/sign-in/page.tsx`, `src/app/upgrade/{page.tsx,actions.ts}`,
  `src/app/upgrade/success/page.tsx`, `src/app/account/{page.tsx,actions.ts}` —
  the payment leg (`account/actions.ts` holds the sign-out server action);
  `src/components/AutoSubmit.tsx` — the prefetch-safe checkout auto-forward.
- `src/app/api/stripe/webhook/route.ts` — signature-verified event → plan
  transitions.

## Plan states

| plan | tool calls | set by |
|---|---|---|
| `trial` (default) | 50 upfront calls, then 20/day (Rome midnight reset), then daily block | lazy provisioning on first gated call |
| `active` | unlimited | `checkout.session.completed`, subscription `active`/`trialing` |
| `past_due` | allowed + fix-payment warning (Stripe is dunning); web surfaces route to the **portal**, not checkout | subscription `past_due` |
| `canceled` | blocked with reactivate message | subscription deleted / `canceled`/`unpaid`/`incomplete_expired` |

## Public pricing (packaging)

The public listino ([ADR 0008](../decisions/0008-listino-pubblico-packaging.md))
maps onto the plan states above — it is **packaging, not a second mechanism**:

| Public tier | Price | Plan state | Notes |
|---|---|---|---|
| **Free** | €0/mo | `trial` | The daily cap *is* the free tier (no separate free-forever code). 1 user, all tools, email support. |
| **Premium** | **€98/mo** | `active` | The single `STRIPE_PRICE_ID`. 1 user, unlimited, priority support. |
| **Su misura** | quote | — | Enterprise (multi-seat, SSO). Sales channel (`mailto:info@dottcomm.dev`), **no self-serve checkout code yet**. |

Keep three places in sync when the price changes: the landing Prezzi section
(`src/app/page.tsx`), ADR 0008, and the Stripe Price (`STRIPE_PRICE_ID`). The Free
card's "utilizzo mensile limitato" copy is a commercial simplification of the
real *daily* cap (`DAILY_TOOL_CALL_LIMIT`).

## Environment variables

| Var | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | entitlement store (server-only; anon key unused) |
| `TRIAL_TOOL_CALL_LIMIT` | upfront lifetime pool (default 50) |
| `DAILY_TOOL_CALL_LIMIT` | recurring daily allowance after the pool (default 20) |
| `NEXT_PUBLIC_SITE_URL` | builds the `/upgrade` link inside tool responses |
| `MCP_DEV_USER_ID` | dev only: exercise the gate with auth off |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `MAGIC_LINK_FROM` | website Better Auth sessions (same instance as the MCP AS) — see [mcp-auth-setup.md](./mcp-auth-setup.md) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | payments |

## Setup steps

1. **Supabase**: create project → apply the schema with the CLI
   (`npx supabase link` → baseline → `npm run db:push`; see
   [db-schema-migrations.md](./db-schema-migrations.md)) → copy `SUPABASE_URL` +
   service_role key.
2. **Stripe (test mode)**: create Product + flat monthly Price → `STRIPE_PRICE_ID`;
   add webhook endpoint `https://<prod>/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted` → `STRIPE_WEBHOOK_SECRET`; enable the
   Customer Portal (with cancel).
3. **Better Auth + Resend** (the website session layer — full steps in
   [mcp-auth-setup.md](./mcp-auth-setup.md)): set `BETTER_AUTH_URL`, generate
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), point `DATABASE_URL` at the
   Supabase session pooler, and add `RESEND_API_KEY` + `MAGIC_LINK_FROM` for
   magic-link email. Same Better Auth instance as the MCP AS, so the `user_id`
   matches across the site and the MCP.
4. **Vercel**: set every var above (Preview + Production), redeploy.

## Verify

- **Gate, no OAuth needed**: `MCP_REQUIRE_AUTH=false MCP_DEV_USER_ID=user_test
  TRIAL_TOOL_CALL_LIMIT=3` + real Supabase → call a tool 5×: 1–2 normal, 3
  warned, 4–5 blocked; check the `users_billing` row. Flip `plan` by hand to
  see `active`/`canceled` behavior.
- **Fail closed**: point `SUPABASE_URL` at garbage → calls return the
  temporary-problem message, tool body never runs.
- **Payments (test mode)**: `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` (use its `whsec_`), sign in on
  `/upgrade`, pay with `4242 4242 4242 4242`, watch `plan` flip to `active`
  and the next tool call unblock; cancel from `/account` → portal → blocked
  again. Junk-signature POST to the webhook → 400.

## Gotchas (learned building this)

- **`src/proxy.ts` matcher must never cover `/api/*` or `/.well-known/*`** — the
  MCP endpoint, its discovery metadata, and the Better Auth catch-all at
  `/api/auth/*` all do their own auth; a session guard would break them. The
  matcher is an explicit allowlist — only `/account` (`/upgrade` is public and
  renders its own sign-in CTA).
- **The proxy check is optimistic** — `getSessionCookie` only confirms a cookie
  is present, not valid (no DB round trip). Server components behind it
  re-validate with `auth.api.getSession`, so `/account` keeps a belt-and-braces
  redirect for the case the optimistic check lets a stale cookie through.
- **Blocked tool calls are normal results** (no `isError`, no 4xx): MCP
  clients treat auth-shaped errors as broken connections and may loop into
  re-login. The upgrade message rides in-band and the LLM relays it.
- Webhook handler returns **500 on DB failure** so Stripe retries; all store
  writes are idempotent, so retries are safe.
- **GETs of `/upgrade?t=…` must stay side-effect-free.** Paywall URLs get
  unfurled by link-preview bots (Slack, chat clients, mail scanners); if a GET
  created a Checkout session it would also lazily create a Stripe *customer*
  per unfurl. Hence the auto-forward is a client-side form submit
  (`AutoSubmit`), never a server redirect.
- **`cancel_url` must not point at an auto-forwarding page** — a user backing
  out of Stripe would be bounced straight back into checkout. `?canceled=1`
  breaks the loop (and carries the token so the plan view survives).
