---
title: Serve the MCP server from the website's Next.js app, auth via WorkOS AuthKit
status: accepted
date: 2026-07-06
deciders: [ttassi]
supersedes:
superseded-by: 0012
tags: [mcp, architecture, vercel, nextjs, auth, oauth, workos]
---

# 0001. Serve the MCP server from the website's Next.js app, auth via WorkOS AuthKit

> **Superseded by [ADR 0012](0012-mcp-auth-better-auth-self-hosted.md)** (auth
> only). Decision 1 (co-locate the MCP server in the Next.js app) still holds;
> decision 2 (WorkOS AuthKit as the Authorization Server) was replaced by
> self-hosted Better Auth to remove the ~$100/mo cost.

## Context

Dott. Comm.'s product is an MCP server. We already have a Next.js website
(`companies/dott-comm/code/`) that deploys on Vercel. We needed to decide where
the MCP server lives and how it authenticates clients.

Vercel supports MCP servers as ordinary Next.js **route handlers** via the
`mcp-handler` package, deployed in the same project as the site. For auth,
Vercel prescribes only the *pattern* — the MCP server is an OAuth 2.1 **Resource
Server** that verifies bearer tokens and exposes RFC 9728 protected-resource
metadata pointing at an external **Authorization Server** — but names no vendor.
We needed to pick the AS. MCP clients also require **Dynamic Client
Registration (DCR)**, which not every provider offers.

## Decision

1. **Co-locate the MCP server in the website's Next.js app**, served from a
   `app/api/[transport]/route.ts` route handler (`mcp-handler`), reachable at
   `/api/mcp`. One repo, one Vercel project, one domain — no separate service.
2. **Use WorkOS AuthKit as the Authorization Server.** The MCP server stays a
   pure Resource Server: it verifies AuthKit-issued JWT access tokens against
   AuthKit's JWKS (`/oauth2/jwks`) using `jose`, checking `issuer` and
   `audience`. No WorkOS SDK is needed on the resource-server side.
3. **Gate enforcement behind `MCP_REQUIRE_AUTH`** so local/dev can run open
   while production requires a valid token.

## Alternatives considered

- **Separate standalone MCP service** — extra deploy, domain, and CI for no
  benefit at this stage; the product is one thing today. Co-location wins on
  simplicity; revisit if the site and MCP need independent release cadences.
- **Roll our own OAuth AS** — issuing tokens, login UI, and DCR is exactly the
  undifferentiated work AuthKit exists to remove. Not worth building.
- **Other managed AS (Auth0, Clerk, Stytch, Scalekit)** — all viable. WorkOS was
  chosen for first-class MCP support and DCR. Not a one-way door: the AS is
  swappable via `AUTHKIT_DOMAIN` + the protected-resource metadata.

## Consequences

- **Positive:** trivial deploy story; auth is spec-compliant and offloaded;
  swapping the AS later is a config change, not a rewrite.
- **Trade-offs / negative:** site and MCP share a deployment — a bad site deploy
  can roll back the MCP and vice versa (acceptable for one product now).
  Route-handler functions are stateless; any session state needs external
  storage. `mcp-handler` runs stateless (no Redis) for now.
- **Follow-ups:**
  - Complete WorkOS Dashboard setup + set env vars in Vercel (see
    [mcp-auth-setup.md](../knowledge/mcp-auth-setup.md)).
  - Define a **scope/permission model** in WorkOS and enforce `requiredScopes`
    in `withMcpAuth` — currently any valid token is accepted.
  - Replace the placeholder capabilities with real skills/tools from
    [catalogo-skills-tools.md](../brainstorms/catalogo-skills-tools.md).
  - Consider enabling Vercel **Fluid compute** for the MCP function's bursty
    workload profile.
