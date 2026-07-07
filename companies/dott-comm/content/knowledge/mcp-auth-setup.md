---
title: MCP server — auth setup (WorkOS AuthKit) for developers
status: active
owner: ttassi
updated: 2026-07-07
tags: [mcp, auth, oauth, workos, vercel, engineering, runbook]
---

# MCP server — auth setup (for developers)

How the Dott. Comm. MCP server authenticates clients, and the steps to turn auth
on. Decision context: [ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md).
For the end-user "how do I connect" guide, see [mcp-user-guide.md](./mcp-user-guide.md).
The billing/paywall layer that sits on top of this auth: [billing-setup.md](./billing-setup.md).
Setting up from scratch? Follow the ordered checklist in
[dev-setup-guide.md](./dev-setup-guide.md) — this doc is the auth deep dive.

## How it works

The MCP server (`companies/dott-comm/code/`) is an OAuth 2.1 **Resource Server**.
It does **not** issue tokens or run a login UI — **WorkOS AuthKit** does that.
The server only *verifies* the bearer JWT that clients present.

```
MCP client ──(1) discover──▶ /.well-known/oauth-protected-resource ──▶ points at AuthKit
           ──(2) login/DCR─▶ WorkOS AuthKit  ──▶ issues JWT access token
           ──(3) call+token▶ /api/mcp        ──▶ verifies JWT vs AuthKit JWKS
```

Relevant code:

- `src/app/api/[transport]/route.ts` — the MCP handler + `withMcpAuth`. `verifyToken`
  validates the JWT against AuthKit's JWKS (`/oauth2/jwks`), checking `issuer`
  (the AuthKit domain) and `audience` (this server's MCP URL). Verification uses
  `jose`; no WorkOS SDK is needed server-side.
- `src/app/.well-known/oauth-protected-resource/route.ts` — RFC 9728 metadata that
  advertises the AuthKit domain as the authorization server.
- `.env.example` — the env vars below.

## Environment variables

| Var | Purpose | Example |
|---|---|---|
| `MCP_REQUIRE_AUTH` | Enforce auth. Off = open (dev). | `true` |
| `AUTHKIT_DOMAIN` | AuthKit domain = OAuth issuer + JWKS base. | `https://your-app.authkit.app` |
| `MCP_RESOURCE_URL` | This server's public MCP URL = token audience. Must match the Resource Indicator in WorkOS. | `https://dott-comm.vercel.app/api/mcp` |

Fail-closed: if `MCP_REQUIRE_AUTH=true` but `AUTHKIT_DOMAIN`/`MCP_RESOURCE_URL`
are missing, every request is rejected rather than accepting unverifiable tokens.

## Setup steps

1. **WorkOS Dashboard**
   - Note your **AuthKit domain** → `AUTHKIT_DOMAIN`.
   - Register the MCP server URL as a **Resource Indicator** (must equal
     `MCP_RESOURCE_URL`).
   - Enable **Dynamic Client Registration (DCR)** for MCP clients that don't yet
     support Client ID Metadata Documents.
2. **Set env vars** — locally (copy `.env.example` → `.env.local`) and in the
   Vercel project (Preview + Production). Keep `MCP_REQUIRE_AUTH=false` until
   the Dashboard side is ready.
3. **Flip enforcement** — set `MCP_REQUIRE_AUTH=true` and redeploy.

## Verify

With auth **on**, from the deployed (or `next start`) server:

```bash
BASE=<your-mcp-url>            # e.g. https://dott-comm.vercel.app/api/mcp
# No token → 401 with a WWW-Authenticate: ... resource_metadata=... header
curl -s -i -X POST "$BASE" -H 'Content-Type: application/json' \
  -H 'Accept: application/json,text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | grep -iE 'HTTP/|www-authenticate'
# Metadata advertises the AuthKit domain
curl -s "${BASE%/api/mcp}/.well-known/oauth-protected-resource"
```

With auth **off**, `tools/list` returns the registered tools without a token.

> Local caveat: Next 16 dev refuses a second dev server for the same project
> dir. To test the auth-on path locally while another dev server is up, use a
> production build: `npm run build && MCP_REQUIRE_AUTH=true … npx next start -p 3007`.

## Open items

- **Scopes:** `requiredScopes` is not enforced yet — any valid AuthKit token is
  accepted. Once a WorkOS scope/permission model exists, enforce it in
  `withMcpAuth` and map claims in `verifyToken`.
- **Statelessness:** `mcp-handler` runs stateless (no Redis). Revisit if a
  transport needs server-side sessions.
