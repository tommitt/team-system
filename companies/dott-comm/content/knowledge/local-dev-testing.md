---
title: Local dev & testing — run the whole app (DB + auth + MCP + billing) on your laptop
status: active
owner: ttassi
updated: 2026-07-08
tags: [mcp, better-auth, supabase, billing, local, devex, testing, runbook, engineering]
---

# Local dev & testing — everything on your laptop

How a developer runs the **entire** Dott. Comm. app locally — Postgres, website
sign-in, the MCP server, and the billing gate — with **no external accounts** and
a faked auth loop. This is the day-to-day inner loop; the
[dev-setup-guide](./dev-setup-guide.md) is its complement (the one-time **prod /
dashboards** checklist).

Everything is env-driven, so "go local" is just a local database + a local
`.env.local`. Auth design: [ADR 0012](../decisions/0012-mcp-auth-better-auth-self-hosted.md).
Billing: [ADR 0002](../decisions/0002-billing-supabase-stripe-usage-trial.md).

## What runs where

`npm run db:start` (Supabase CLI) brings up a full local stack in Docker; the app
(`npm run dev`) runs on the host and points at it. One local Postgres backs all
three consumers at once:

| Service | Local URL | Used by |
|---|---|---|
| Postgres | `postgres://postgres:postgres@127.0.0.1:54322/postgres` | Better Auth (direct `pg`, `DATABASE_URL`) |
| PostgREST / API | `http://127.0.0.1:54321` | billing gate (`SUPABASE_URL` + service_role) |
| Studio (DB GUI) | `http://127.0.0.1:54323` | you, to inspect rows |
| Mailpit (mail viewer) | `http://127.0.0.1:54324` | — (we don't send email locally; see below) |

Migrations `00001–00005` apply on start/reset, so the local DB gets
`users_billing` + `increment_usage`, `tool_events`/`feedback`, **and** the Better
Auth tables (`user`/`session`/`oauth*`, from `00004`) + the service_role grants
(`00005` — this is exactly what makes a from-migrations local rebuild work).

## Prerequisites

- **Docker Desktop, running** (the whole local stack lives in containers).
- Node + repo installed (`npm install` in `companies/dott-comm/code/`). The
  Supabase CLI ships as a devDependency — no global install.

## One-time / start of session

```bash
cd companies/dott-comm/code
npm run db:start                 # boot Postgres + PostgREST + Studio + Mailpit (first run pulls images)
cp .env.local.example .env.local # local wiring — already points at the stack above
npm run dev                      # Next dev server on http://localhost:3000
```

`npm run db:status` prints the URLs and the local API keys. The
`service_role` key in `.env.local.example` is the **standard local demo key**
(identical for every local Supabase project — not a secret); if `db:status`
shows a different one, paste that into `SUPABASE_SERVICE_ROLE_KEY`.

`npm run db:reset` re-applies all migrations **and** `supabase/seed.sql`,
resetting the DB to a known state (seeded billing rows, empty auth tables).

## The two auth loops (this is the "faked" part)

### 1. Website session — magic link, read from the console

Sign-in is email magic link only. Locally we set **no** `RESEND_API_KEY`, so
instead of sending an email, `sendMagicLinkEmail` (`src/lib/auth.ts`) logs the
link to the `npm run dev` console:

```
[magic-link] RESEND_API_KEY unset — link for you@example.com: http://localhost:3000/api/auth/magic-link/verify?token=…
```

Flow: open `http://localhost:3000/sign-in` → enter any email → **copy the URL
from the dev console** → open it. You now have a real Better Auth session (a real
row in the local `user`/`session` tables); `/account` and `/upgrade` work.

### 2. MCP tools — a fast faked identity, or the real OAuth loop

**Fast path (no OAuth) — the everyday one.** With `MCP_REQUIRE_AUTH=false` and
`MCP_DEV_USER_ID=<id>`, every tool call runs as that fake user
(`resolveUserId`, `src/lib/mcp/register-gated-tool.ts`) straight against the
local billing gate. Point `MCP_DEV_USER_ID` at a **seeded** row to exercise a
branch of the paywall (`supabase/seed.sql`):

| `MCP_DEV_USER_ID` | State | Expected |
|---|---|---|
| `dev_trial` | fresh trial | allowed; warns as it nears `TRIAL_TOOL_CALL_LIMIT` |
| `dev_active` | active subscription | always allowed (no Stripe needed) |
| `dev_canceled` | canceled | blocked with the reactivate message |
| `dev_trial_spent` | trial spent | blocked on the daily allowance |

Leave `MCP_DEV_USER_ID` **unset** to run tools ungated (pure fiscal tools work
without touching Supabase at all).

Call a tool with the MCP Inspector pointed at the local server:

```bash
npx @modelcontextprotocol/inspector      # connect it to http://localhost:3000/api/mcp
```

Each metered call also writes a `tool_events` row — check it in Studio.

**Real OAuth loop (verify once).** To exercise the actual token dance against
local Better Auth, set `MCP_REQUIRE_AUTH=true` and restart `npm run dev`:

```bash
node scripts/check-oauth.mjs http://localhost:3000/api/mcp
```

should show the protected-resource + AS metadata and a tokenless `401` with
`WWW-Authenticate`. Then connect the Inspector to `http://localhost:3000/api/mcp`
→ it does DCR → `/sign-in` (magic link from the console) → `/consent` → a real
opaque token → tool call. The user id is now the real Better Auth user id, and
the gate lazy-provisions a `users_billing` row for it.

### Testing the paywall token flow (`/upgrade?t=…`)

To exercise the upgrade-token path (auto-forward to checkout without a session,
[ADR 0013](../decisions/0013-billing-web-ux-account-standalone-upgrade-dispatcher.md)),
mint a token by hand — mind the precedence: the app signs with
**`UPGRADE_TOKEN_SECRET` first**, falling back to `BETTER_AUTH_SECRET`; a token
signed with the wrong one verifies as null and the page silently shows the
signed-out prompt.

```bash
SECRET=<UPGRADE_TOKEN_SECRET or, if unset, BETTER_AUTH_SECRET from .env.local>
SECRET="$SECRET" node -e '
const {createHmac} = require("node:crypto");
const body = Buffer.from(JSON.stringify({sub: "<user_id>", exp: Math.floor(Date.now()/1000)+900})).toString("base64url");
console.log(body + "." + createHmac("sha256", process.env.SECRET).update(body).digest("base64url"));'
```

Open `http://localhost:3000/upgrade?t=<token>` in a browser: with Stripe test
keys set it auto-forwards to Checkout (`?canceled=1` must NOT); with a `curl`
GET (≈ a link-preview bot) no Stripe session must be created.

## Billing / payments locally (optional)

The seeded `dev_active` / `dev_canceled` rows cover the gate without Stripe. To
test the **real payment loop** (checkout → webhook flips the plan), use Stripe
test mode + the CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints a whsec_… → STRIPE_WEBHOOK_SECRET
```

then sign in, go to `/upgrade`, pay with `4242 4242 4242 4242`. Details:
[billing-setup.md](./billing-setup.md).

## Reset & teardown

```bash
npm run db:reset   # wipe + re-apply migrations + seed (fresh known state)
npm run db:stop    # stop the containers at end of session
```

## Gotchas

- **Empty gate / `SUPABASE_URL not set`** → you're missing `.env.local` or the
  stack isn't up. `npm run db:status` should list the four services.
- **Magic link never appears** → it's in the `npm run dev` console, not an inbox
  (no `RESEND_API_KEY` locally, by design).
- **Better Auth can't connect** → the stack is down, or `DATABASE_URL` doesn't
  point at `127.0.0.1:54322` (the local direct Postgres port).
- **Session won't stick / `/sign-in` 404** → `BETTER_AUTH_URL` must be
  `http://localhost:3000` (the cookie origin) — a mismatch breaks the session.
- **Schema looks stale** after editing `supabase/schemas/*.sql` → `npm run
  db:reset` re-derives from migrations; remember migrations are the applied
  history (`db:diff` generates them from the schema — see
  [db-schema-migrations.md](./db-schema-migrations.md)).
