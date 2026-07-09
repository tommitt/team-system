---
title: MCP server — auth setup (Better Auth) for developers
status: active
owner: ttassi
updated: 2026-07-07
tags: [mcp, auth, oauth, better-auth, supabase, vercel, engineering, runbook]
---

# MCP server — auth setup (for developers)

How the Dott. Comm. MCP server authenticates clients, and the steps to turn auth
on. Decision context: [ADR 0012](../decisions/0012-mcp-auth-better-auth-self-hosted.md)
(supersedes [ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md)).
For the end-user "how do I connect" guide, see [mcp-user-guide.md](./mcp-user-guide.md).
The billing/paywall layer that sits on top of this auth: [billing-setup.md](./billing-setup.md).
Setting up from scratch? Follow the ordered checklist in
[dev-setup-guide.md](./dev-setup-guide.md) — this doc is the auth deep dive.

## How it works

Auth is **self-hosted Better Auth**, running in-process in the Next.js app. It is
BOTH the website's session provider AND the OAuth 2.1 **Authorization Server** for
the MCP. Better Auth stores its tables in the same Supabase Postgres as billing,
over a **direct `pg` connection** (`DATABASE_URL`), separate from the Supabase
service-role client billing uses.

The MCP endpoint itself stays a pure OAuth 2.1 **Resource Server**: it does not
run a login UI; it verifies the bearer token clients present.

```
MCP client ──(1) discover──▶ /.well-known/oauth-protected-resource ──▶ points at this origin (the AS)
           ──(2) discover──▶ /.well-known/oauth-authorization-server ──▶ authorize/token/register endpoints
           ──(3) login/DCR─▶ Better Auth (/sign-in, /consent, DCR) ──▶ issues OPAQUE access token
           ──(4) call+token▶ /api/mcp ──▶ verifies token by INTROSPECTION (auth.api.getMcpSession)
```

Sign-in is **email magic link only** — no passwords, no external IdP (Google was
deliberately dropped; see [ADR 0012](../decisions/0012-mcp-auth-better-auth-self-hosted.md)).
Better Auth issues **opaque** access tokens (random strings in `oauthAccessToken`),
not JWTs — so the resource server verifies a bearer by **introspection**, not by
decoding a JWT against JWKS. Audience/resource binding is enforced by the AS at
token-issue time (the `resource` option on the `mcp` plugin), so there is no `aud`
claim for the resource server to re-check.

Relevant code (`companies/dott-comm/code/`):

- `src/lib/auth.ts` — the Better Auth instance: magic-link sign-in (Resend
  sender, console-log fallback when `RESEND_API_KEY` is unset), and the `mcp`
  plugin (OAuth AS: discovery, DCR, token endpoint, `/mcp/get-session`
  introspection). `resource: MCP_RESOURCE_URL` binds issued tokens.
- `src/lib/auth-client.ts` — browser client (`magicLinkClient` + `oidcClient`)
  used by the sign-in and consent pages.
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all (login,
  magic-link verify, OAuth endpoints, DCR, consent, introspection).
- `src/app/api/[transport]/route.ts` — the MCP handler + `withMcpAuth`.
  `verifyToken` calls `auth.api.getMcpSession({ headers })` and maps `userId`
  into `AuthInfo.extra` for the billing gate.
- `src/app/.well-known/oauth-protected-resource/route.ts` — RFC 9728 metadata
  (`oAuthProtectedResourceMetadata(auth)`), advertises the `resource` + this
  origin as the AS.
- `src/app/.well-known/oauth-authorization-server/route.ts` — RFC 8414 metadata
  (`oAuthDiscoveryMetadata(auth)`); MCP clients fetch this at the site root.
- `src/app/sign-in/page.tsx` + `src/components/SignInForm.tsx` — magic-link UI.
- `src/app/consent/page.tsx` + `src/components/ConsentForm.tsx` — OAuth consent
  screen for DCR clients (POSTs to `/api/auth/oauth2/consent`).
- `src/proxy.ts` — optimistic session-cookie guard for `/account`
  (`getSessionCookie`); server components re-validate via `auth.api.getSession`.
- `.env.example` — the env vars below.

## Environment variables

| Var | Purpose | Example |
|---|---|---|
| `MCP_REQUIRE_AUTH` | Enforce auth. Off = open (dev). | `true` |
| `BETTER_AUTH_URL` | App base URL = OAuth issuer origin (no trailing slash). | `https://www.dottcomm.dev` |
| `BETTER_AUTH_SECRET` | Server secret (sessions/tokens). ≥32 chars. | `openssl rand -base64 32` |
| `DATABASE_URL` | Direct Postgres connection for Better Auth's tables (Supabase **session pooler**, port 5432). | `postgres://…:5432/postgres` |
| `RESEND_API_KEY` | Sends magic-link emails (verified sender domain). Unset → link logged to server console (dev). | — |
| `MAGIC_LINK_FROM` | From address for magic-link emails. | `DottComm <accesso@dottcomm.dev>` |
| `MCP_RESOURCE_URL` | This server's public MCP URL = the token `resource`. | `https://www.dottcomm.dev/api/mcp` |

## Setup steps

1. **Provision Better Auth's tables in Supabase — via the declarative schema,
   NOT `@better-auth/cli migrate`** (ADR 0007 owns the migration history). The
   DDL Better Auth needs is captured verbatim in `supabase/schemas/03_auth.sql`
   (emitted by `@better-auth/cli generate`); the rename + auth tables ship in
   `supabase/migrations/00004_better_auth_and_user_id.sql`. Apply it with
   `npm run db:push`, then regenerate types with `npm run db:types`. After a
   Better Auth **upgrade**, re-run `npx @better-auth/cli generate --config
   src/lib/auth.ts` and diff its output against `03_auth.sql`; fold any change in
   through `db:diff` (never edit the auth tables by hand).
2. **Resend** → `RESEND_API_KEY` + a verified sender domain (`MAGIC_LINK_FROM`,
   e.g. `DottComm <accesso@dottcomm.dev>`). Until the domain verifies,
   `onboarding@resend.dev` only delivers to your own address.
3. **Set env vars** — locally (`.env.example` → `.env.local`) and in Vercel
   (Preview + Production). Keep `MCP_REQUIRE_AUTH=false` until ready. Use a
   distinct `BETTER_AUTH_SECRET` for prod.
4. **Flip enforcement** — set `MCP_REQUIRE_AUTH=true` and redeploy.

## Verify

Discovery + unauth behavior, against the deployed (or `next start`) server:

```bash
node scripts/check-oauth.mjs https://www.dottcomm.dev/api/mcp
# [1] protected-resource metadata advertises resource === your MCP URL
# [2] AS metadata exposes authorize/token/registration (DCR) endpoints
# [3] unauthenticated POST → 401 + WWW-Authenticate: … resource_metadata=…
```

A token only fully proves out by connecting a real MCP client (e.g. Claude): DCR
registers a client, `/sign-in` then `/consent` complete, a gated tool call
succeeds and increments the `users_billing` row for the Better Auth user id.

With auth **off**, `tools/list` returns the registered tools without a token.

> Local caveat: Next 16 dev refuses a second dev server for the same project
> dir. To test the auth-on path locally while another dev server is up, use a
> production build: `npm run build && MCP_REQUIRE_AUTH=true … npx next start -p 3007`.

## Open items

- **Scopes:** `requiredScopes` is not enforced yet — any valid Better Auth token
  is accepted. Once a scope model exists, enforce it in `withMcpAuth` and map
  scopes from the introspected session in `verifyToken`.
- **Statelessness:** `mcp-handler` runs stateless (no Redis). Revisit if a
  transport needs server-side sessions.
- **Cost:** this migration removed the ~$100/mo WorkOS bill; cancel the WorkOS
  subscription only after an MCP client reconnects cleanly against Better Auth.
