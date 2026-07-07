---
title: MCP billing — Supabase free-trial gate + Stripe (for developers)
status: active
owner: ttassi
updated: 2026-07-07
tags: [mcp, billing, stripe, supabase, workos, paywall, engineering, runbook]
---

# MCP billing — free-trial gate + Stripe (for developers)

How the Dott. Comm. MCP meters usage, enforces the free trial, and takes
payment. Decision context: [ADR 0002](../decisions/0002-billing-supabase-stripe-usage-trial.md).
Auth (the layer under this): [mcp-auth-setup.md](./mcp-auth-setup.md).
Setting up from scratch? Follow the ordered checklist in
[dev-setup-guide.md](./dev-setup-guide.md) — this doc is the billing deep dive.

## How it works

Identity lives in **WorkOS** (JWT `sub`), money in **Stripe**, request-time
entitlement (plan + usage counter) in **Supabase Postgres**.

```
tool call ──▶ registerGatedTool (lib/mcp/tools.ts)
                └─▶ checkAndRecordUsage(userId)          one RPC round trip
                      └─▶ Supabase increment_usage()     atomic upsert+increment
                            returns { usage_count, plan }
              allowed → run tool (± trial warning appended)
              blocked → normal tool result with upgrade message (never 401/403)

pay ──▶ site /upgrade (AuthKit session, same WorkOS env) ──▶ Stripe Checkout
Stripe webhook ──▶ /api/stripe/webhook ──▶ flips plan in Supabase
              → the user's NEXT tool call is unblocked (no token refresh)
```

Free trial = **50 tool calls** by default (`TRIAL_TOOL_CALL_LIMIT`); a warning
is appended to results from 80% of the limit. Paid plan = flat monthly Stripe
subscription, unlimited (usage still recorded). **Fail closed**: Supabase
unreachable → the call is blocked with a friendly Italian message, never
served unmetered.

## Relevant code (`companies/dott-comm/code/`)

- `supabase/migrations/00001_users_billing.sql` — `users_billing` table
  (RLS on, zero policies → service-role only) + `increment_usage()` RPC.
- `lib/billing/supabase.ts` — service-role client singleton (`server-only`).
- `lib/billing/gate.ts` — `checkAndRecordUsage`, pure `decide()` behavior
  matrix, `getBillingRow`.
- `lib/billing/store.ts` — write helpers shared by checkout actions + webhook
  (idempotent, safe under Stripe retries).
- `lib/mcp/tools.ts` — `registerGatedTool` wrapper; register every tool
  through it.
- `proxy.ts` — AuthKit sessions for `/upgrade` + `/account` (Next 16 renamed
  middleware → proxy). `middlewareAuth` enabled; `/upgrade` is public.
- `app/auth/callback/route.ts`, `app/upgrade/{page.tsx,actions.ts}`,
  `app/upgrade/success/page.tsx`, `app/account/page.tsx` — the payment leg.
- `app/api/stripe/webhook/route.ts` — signature-verified event → plan
  transitions.

## Plan states

| plan | tool calls | set by |
|---|---|---|
| `trial` (default) | allowed up to limit, then blocked | lazy provisioning on first gated call |
| `active` | unlimited | `checkout.session.completed`, subscription `active`/`trialing` |
| `past_due` | allowed + fix-payment warning (Stripe is dunning) | subscription `past_due` |
| `canceled` | blocked with reactivate message | subscription deleted / `canceled`/`unpaid`/`incomplete_expired` |

## Environment variables

| Var | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | entitlement store (server-only; anon key unused) |
| `TRIAL_TOOL_CALL_LIMIT` | free-trial cap (default 50) |
| `NEXT_PUBLIC_SITE_URL` | builds the `/upgrade` link inside tool responses |
| `MCP_DEV_USER_ID` | dev only: exercise the gate with auth off |
| `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | website AuthKit sessions (same WorkOS env as the MCP AS) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | payments |

## Setup steps

1. **Supabase**: create project → run `supabase/migrations/00001_users_billing.sql`
   in the SQL Editor → copy `SUPABASE_URL` + service_role key.
2. **Stripe (test mode)**: create Product + flat monthly Price → `STRIPE_PRICE_ID`;
   add webhook endpoint `https://<prod>/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted` → `STRIPE_WEBHOOK_SECRET`; enable the
   Customer Portal (with cancel).
3. **WorkOS**: in the same environment as the MCP AS, register redirect URIs
   `http://localhost:3000/auth/callback` and the prod equivalent; copy
   `WORKOS_CLIENT_ID` + `WORKOS_API_KEY`; generate `WORKOS_COOKIE_PASSWORD`
   (`openssl rand -base64 24`).
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

- **`proxy.ts` matcher must never cover `/api/*` or `/.well-known/*`** — the
  MCP endpoint does bearer auth; AuthKit session logic would break it. The
  matcher is an explicit allowlist (`/upgrade`, `/account`).
- **`getSignInUrl()` / `withAuth({ ensureSignedIn })` set a PKCE cookie** in
  authkit-nextjs 4.x — illegal during server-component render in Next 16.
  Sign-in must go through a server action (`signIn()` in
  `app/upgrade/actions.ts`) and signed-out protection through the proxy's
  `middlewareAuth`, not `ensureSignedIn` in pages.
- **Blocked tool calls are normal results** (no `isError`, no 4xx): MCP
  clients treat auth-shaped errors as broken connections and may loop into
  re-login. The upgrade message rides in-band and the LLM relays it.
- Webhook handler returns **500 on DB failure** so Stripe retries; all store
  writes are idempotent, so retries are safe.
