---
title: Dev setup guide — everything to configure by hand (Vercel, WorkOS, Supabase, Stripe)
status: active
owner: ttassi
updated: 2026-07-07
tags: [mcp, setup, runbook, vercel, workos, supabase, stripe, engineering]
---

# Dev setup guide — from zero to a working, paywalled MCP

The single ordered checklist of every **manual** step a developer must do in
external dashboards to bring the Dott. Comm. app (site + MCP + billing) fully
live. The code needs no changes — it reads everything from env vars.

Deep dives (how each layer works, debugging, gotchas):
[mcp-auth-setup.md](./mcp-auth-setup.md) (auth) ·
[billing-setup.md](./billing-setup.md) (billing) ·
[ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md) ·
[ADR 0002](../decisions/0002-billing-supabase-stripe-usage-trial.md).

**Order matters:** Vercel comes first because the production domain feeds
almost everything else (token audience, redirect URIs, webhook URL, upgrade
links).

## 0. Prerequisites

- [ ] Accounts: [Vercel](https://vercel.com), [WorkOS](https://dashboard.workos.com),
      [Supabase](https://supabase.com), [Stripe](https://dashboard.stripe.com).
- [ ] CLIs (local testing): `npm i -g vercel`, the
      [Stripe CLI](https://docs.stripe.com/stripe-cli) (`brew install stripe/stripe-cli/stripe`).
      The **Supabase CLI** ships as a devDependency (`npx supabase`) — no global
      install. For DB schema work you also need **Docker Desktop** running (the
      migration diff engine uses a throwaway shadow DB); see
      [db-schema-migrations.md](./db-schema-migrations.md).
- [ ] Local env file: `cp code/.env.example code/.env.local` — you'll fill it
      in as you go. Keep `MCP_REQUIRE_AUTH=false` until the very last step.

## 1. Vercel — deploy the app, get the domain

The deployable app is **not at the repo root** — it lives at
`companies/dott-comm/code/` (the group is a company-of-companies monorepo). So
Vercel must be told where the project root is, or the build fails ("no
framework detected" / missing `package.json`).

- [ ] **Root Directory** (required, both paths below): set it to
      `companies/dott-comm/code`. Leave "Include files outside the root
      directory" **off** — the app is self-contained and imports nothing from
      parent folders. Vercel then auto-detects Next.js and runs `next build`
      from there.
      - **GitHub auto-deploy** (the connected-repo path): Project → Settings →
        Build & Deployment → **Root Directory** → Edit → `companies/dott-comm/code`.
        This is the *only* way to relocate the root — a root `vercel.json`
        cannot do it.
      - **CLI**: run `vercel link` / `vercel deploy --prod` *from inside*
        `companies/dott-comm/code/`, which sets the root for you.
- [ ] Note the production domain, e.g. `https://dott-comm.vercel.app`. This
      determines three values used everywhere below:
      - `MCP_RESOURCE_URL` = `https://<domain>/api/mcp`
      - `NEXT_PUBLIC_SITE_URL` = `https://<domain>`
      - `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (prod) = `https://<domain>/auth/callback`

> Env vars get set in step 5; the first deploy will run with auth off and no
> billing, which is fine.

## 2. WorkOS — one environment, two jobs

The same WorkOS environment is both the MCP's **Authorization Server** (issues
the bearer JWTs) and the website's **session login** (`/upgrade`, `/account`),
so the user id matches across both.

- [ ] Note the **AuthKit domain** (Overview → AuthKit) → `AUTHKIT_DOMAIN`
      (e.g. `https://your-app.authkit.app`).
- [ ] **Resource Indicator**: register the MCP URL — must equal
      `MCP_RESOURCE_URL` exactly (`https://<domain>/api/mcp`).
- [ ] Enable **Dynamic Client Registration (DCR)** (Applications →
      Configuration) so MCP clients can self-register.
- [ ] **Redirects**: add both callback URIs:
      `http://localhost:3000/auth/callback` and
      `https://<domain>/auth/callback`.
- [ ] Copy the API key and client id → `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`.
- [ ] Generate the session cookie secret: `openssl rand -base64 24` →
      `WORKOS_COOKIE_PASSWORD` (32+ chars).

## 3. Supabase — the entitlement/usage store

- [ ] Create a project (pick a region near the Vercel deployment; free tier is
      fine for now).
- [ ] Apply the schema with the **Supabase CLI**, not the SQL Editor:
      `npx supabase login` → `npx supabase link --project-ref <ref>` →
      **baseline** the existing migrations
      (`npx supabase migration repair --status applied 00001 00002 00003`,
      one-time) → `npm run db:push`. Full procedure (and the schema/migration
      workflow) in [db-schema-migrations.md](./db-schema-migrations.md).
- [ ] Project Settings → API: copy the **Project URL** → `SUPABASE_URL` and
      the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`. (The anon key is
      never used; never expose the service key as `NEXT_PUBLIC_`.)

## 4. Stripe — product, webhook, portal (test mode first)

- [ ] Product catalogue → create Product "Dott. Comm." with one **flat monthly
      recurring Price** → copy the id → `STRIPE_PRICE_ID`.
- [ ] Developers → API keys → copy the secret key → `STRIPE_SECRET_KEY`
      (`sk_test_...` for now).
- [ ] Developers → Webhooks → Add endpoint
      `https://<domain>/api/stripe/webhook`, subscribed to exactly:
      `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted` → copy the signing secret →
      `STRIPE_WEBHOOK_SECRET` (this is the **prod** one; `stripe listen`
      prints a different one for local).
- [ ] Settings → Billing → **Customer portal**: enable it and allow
      subscription cancellation (the `/account` page links here).

## 5. Env vars — set everything in Vercel

Project Settings → Environment Variables (Production + Preview), from
`code/.env.example`:

| Var | From step |
|---|---|
| `MCP_REQUIRE_AUTH` | leave `false` until step 6 |
| `AUTHKIT_DOMAIN` | 2 |
| `MCP_RESOURCE_URL` | 1 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 3 |
| `TRIAL_TOOL_CALL_LIMIT` | `50` (product default) |
| `NEXT_PUBLIC_SITE_URL` | 1 |
| `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD` | 2 |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | 1 (prod URI) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | 4 |

`MCP_DEV_USER_ID` is local-only (fake user to exercise the gate without
OAuth) — do **not** set it in Vercel.

- [ ] Mirror the same values into `code/.env.local` (with the localhost
      redirect URI) for local testing.
- [ ] Redeploy: `vercel deploy --prod`.

## 6. Flip auth on

- [ ] Set `MCP_REQUIRE_AUTH=true` in Vercel → redeploy.
- [ ] From now on the MCP rejects tokenless calls with a 401 +
      `WWW-Authenticate` pointing at the discovery metadata.

## 7. Verify end-to-end

Quick smoke (details and expected outputs in the two runbooks):

- [ ] **Auth**: tokenless `tools/list` POST to `https://<domain>/api/mcp` →
      401 with `WWW-Authenticate`; `/.well-known/oauth-protected-resource`
      advertises the AuthKit domain. ([mcp-auth-setup.md → Verify](./mcp-auth-setup.md#verify))
- [ ] **Real client**: connect an MCP client (e.g. `npx
      @modelcontextprotocol/inspector`), complete the AuthKit login, call a
      tool; a `users_billing` row appears with your WorkOS user id.
- [ ] **Trial gate**: locally with `TRIAL_TOOL_CALL_LIMIT=3` +
      `MCP_DEV_USER_ID`, burn the trial and watch warn → block.
      ([billing-setup.md → Verify](./billing-setup.md#verify))
- [ ] **Payment loop**: `stripe listen --forward-to
      localhost:3000/api/stripe/webhook`, sign in at `/upgrade`, pay with
      `4242 4242 4242 4242` → plan flips `active`, next tool call unblocked;
      cancel from `/account` → blocked again.
- [ ] Repeat the payment loop once against prod (still test mode), then swap
      `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` to live keys when ready to
      charge real money.

## When something breaks

- 401s with a valid login → issuer/audience mismatch: `AUTHKIT_DOMAIN` and
  `MCP_RESOURCE_URL` must match the WorkOS dashboard exactly.
- Every tool call blocked with the "problema temporaneo" message → the gate is
  failing closed: check `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and that the
  migration ran.
- Paid but still blocked → the webhook isn't reaching prod: check the endpoint
  URL, events list, and that `STRIPE_WEBHOOK_SECRET` is the dashboard one (not
  the `stripe listen` one).
- `/upgrade` login loop → redirect URI not registered in WorkOS, or
  `WORKOS_COOKIE_PASSWORD` missing/short.
