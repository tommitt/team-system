---
title: Replace WorkOS AuthKit with self-hosted Better Auth as the MCP Authorization Server
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes: 0001
superseded-by:
tags: [mcp, auth, oauth, better-auth, supabase, nextjs, billing, cost]
---

# 0012. Replace WorkOS AuthKit with self-hosted Better Auth

## Context

[ADR 0001](0001-mcp-in-nextjs-app-workos-auth.md) chose **WorkOS AuthKit** as the
OAuth 2.1 Authorization Server for the MCP, and used it for the website's
`/account` + `/upgrade` sessions. AuthKit worked, but it cost **~$100/month at
zero traffic** — the charge comes from the MCP/DCR feature set, not user auth
(AuthKit's user management is free to 1M MAU). In the problem-exploration phase
with no real users, that is a recurring bill for a capability we can self-host.

0001 explicitly called the AS a swappable, non-one-way-door decision. This ADR
takes that door. We also already run **Supabase Postgres** for billing, so a
self-hosted auth library can reuse it with no new infrastructure.

## Decision

Replace WorkOS AuthKit with **Better Auth** (open-source, runs in-process in the
Next.js app), storing its tables in the existing Supabase Postgres over a direct
`pg` connection. Better Auth plays **both** roles AuthKit did:

1. **Website sessions** — `auth.api.getSession()` replaces `withAuth()`. Sign-in
   is **email magic link only** (no passwords, no external identity provider),
   via a self-built `/sign-in` page (AuthKit's hosted login is gone; we own this
   UI now). We deliberately drop Google sign-in for now — it means no Google
   Cloud OAuth client to configure and one less external dependency; add it back
   later (Better Auth ships a `socialProviders` block) if users ask.
2. **MCP Authorization Server** — the Better Auth `mcp` plugin (built on
   `oidcProvider` + `magicLink`) exposes OAuth discovery, JWKS, **Dynamic Client
   Registration**, the token endpoint, and a `/consent` flow (self-built consent
   page). Enforcement stays gated behind `MCP_REQUIRE_AUTH`. The MCP plugin (and
   its DCR support) is required by the Claude connector regardless of how users
   sign in.

**Token verification changed shape.** AuthKit issued **JWT** access tokens that
the resource server verified offline against JWKS (issuer + `aud`). Better Auth
issues **opaque** access tokens (random strings in `oauthAccessToken`), so the
MCP route (`app/api/[transport]/route.ts`) now verifies a bearer by
**introspection** — `auth.api.getMcpSession({ headers })` — instead of decoding a
JWT. mcp-handler's `withMcpAuth` + the downstream billing gate are unchanged:
`verifyToken` still returns `AuthInfo` with `extra.userId`.

**Identity key renamed everywhere.** The legacy `workos_user_id` column (the JWT
`sub`) becomes `user_id` (the Better Auth user id) across **every** table that
carried it — `users_billing`, `tool_events`, and `feedback` — so no table keeps
the WorkOS-era name. Stripe metadata key `workos_user_id` → `app_user_id`. Clean
cutover (no existing users), so plain column renames.

**Better Auth's tables go through the declarative schema, not its CLI.** Better
Auth ships `npx @better-auth/cli migrate` to provision `user`/`session`/
`account`/`verification` + the mcp/oidc tables (`oauthApplication`,
`oauthAccessToken`, `oauthConsent`) directly against the database. We do **not**
use it: that would bypass our migration history and the single source of truth
(ADR 0007). Instead we run `@better-auth/cli generate` to emit the DDL, capture
it verbatim in `supabase/schemas/03_auth.sql`, and let the normal
`db:diff → db:push` flow produce the migration. The rename + the auth tables land
together in `supabase/migrations/00004_better_auth_and_user_id.sql`.

## Alternatives considered

- **Stay on WorkOS** — simplest, but keeps the ~$100/mo bill for a feature we can
  self-host at zero marginal cost given Supabase is already here.
- **Supabase Auth OAuth server** — managed, free in beta, consolidates onto
  Supabase. Rejected as the primary because (a) beta stability/pricing risk and
  (b) weaker audience binding (its access-token `aud` is `authenticated`, not the
  MCP resource URL). Better Auth keeps the resource bound server-side via the
  `mcp` plugin `resource` option.
- **Clerk / Stytch** — viable managed AS with MCP support and free tiers, but
  they reintroduce a vendor. Self-hosting removes the recurring cost entirely.
- **Provision Better Auth tables via its own CLI (`migrate`)** — the library's
  recommended path, but it splits schema ownership: two systems writing DDL to
  one database, and the auth tables invisible to our migration history. Rejected
  for the declarative-schema flow (ADR 0007); the cost is remembering to re-run
  `generate` and diff after Better Auth upgrades (see below).

## Consequences

- **Positive:** recurring auth vendor cost → **$0**; one fewer vendor; identity
  lives in our own Postgres alongside billing; DCR + OAuth are spec-compliant;
  the auth schema lives in one migration history with everything else.
- **Trade-offs / negative:**
  - We now **own the login and consent UI** and the auth upgrade cadence
    (Better Auth version bumps).
  - **Schema drift risk on upgrades:** because we froze the generated DDL into
    `03_auth.sql` instead of delegating to the CLI, a Better Auth version bump
    can change the expected tables. After bumping `better-auth`, re-run
    `@better-auth/cli generate` and diff its output against `03_auth.sql`; fold
    any change in via `db:diff`.
  - **Audience binding is server-side**, not a JWT `aud` check — the resource
    server trusts the AS's introspection rather than re-verifying a signed claim.
    Acceptable for a single in-process AS + resource server on one origin.
  - Magic link adds an **email-sending dependency** (Resend). With no
    `RESEND_API_KEY` the link is logged to the server console (dev only).
  - A new **direct Postgres connection** (`DATABASE_URL`) is required in addition
    to the Supabase service-role client used for billing.
- **Follow-ups:**
  - Apply `00004_better_auth_and_user_id.sql` (`npm run db:push`) + set the new
    env vars in Vercel (see [mcp-auth-setup.md](../knowledge/mcp-auth-setup.md)).
  - Verify a Resend sender domain (`dottcomm.dev`).
  - Enforce a **scope/permission model** in `withMcpAuth` (still any-valid-token).
  - Reconnect the Claude connector (old WorkOS tokens are dead; DCR re-registers),
    then decommission WorkOS — the $100/month goes away.
