#!/usr/bin/env node
/**
 * OAuth / MCP discovery smoke test.
 *
 * Verifies the three things that must agree for AuthKit token verification to
 * succeed, and pinpoints which one drifted when it doesn't:
 *   1. the protected-resource metadata `resource`
 *   2. the audience the server actually checks (MCP_RESOURCE_URL)
 *   3. the `aud` claim in a real token WorkOS minted (optional, if you paste one)
 *
 * Usage:
 *   node scripts/check-oauth.mjs <MCP_URL> [ACCESS_TOKEN]
 *
 *   # against production
 *   node scripts/check-oauth.mjs https://www.dottcomm.dev/api/mcp
 *
 *   # against a local `next start` (see the runbook)
 *   node scripts/check-oauth.mjs http://localhost:3007/api/mcp
 *
 *   # also verify a real access token end-to-end (grab it from an MCP client)
 *   node scripts/check-oauth.mjs https://www.dottcomm.dev/api/mcp eyJhbGc...
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

const mcpUrl = process.argv[2];
const token = process.argv[3];
if (!mcpUrl) {
  console.error("usage: node scripts/check-oauth.mjs <MCP_URL> [ACCESS_TOKEN]");
  process.exit(2);
}
const origin = new URL(mcpUrl).origin;

let failed = false;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failed = true;
  console.log(`  ✗ ${m}`);
};

// 1. Protected-resource metadata (RFC 9728) — no redirects allowed.
console.log(`\n[1] Protected-resource metadata @ ${origin}`);
const prmRes = await fetch(`${origin}/.well-known/oauth-protected-resource`, {
  redirect: "manual",
});
if (prmRes.status >= 300 && prmRes.status < 400) {
  bad(`metadata redirected (${prmRes.status}) to ${prmRes.headers.get("location")} — MCP clients won't follow this; use the canonical domain`);
}
const prm = await prmRes.json().catch(() => ({}));
console.log("    resource:", prm.resource);
console.log("    authorization_servers:", prm.authorization_servers);
if (prm.resource === mcpUrl) ok(`advertised resource === MCP URL you're testing`);
else bad(`advertised resource "${prm.resource}" !== MCP URL "${mcpUrl}" — token audience will never match`);
const authServer = prm.authorization_servers?.[0];

// 2. Authorization server metadata.
console.log(`\n[2] Authorization server metadata @ ${authServer}`);
const asMeta = await fetch(`${authServer}/.well-known/oauth-authorization-server`).then((r) => r.json());
console.log("    issuer:", asMeta.issuer);
console.log("    jwks_uri:", asMeta.jwks_uri);
ok("reachable");

// 3. Unauthenticated MCP call → 401 + WWW-Authenticate pointing at the metadata.
console.log(`\n[3] Unauthenticated POST ${mcpUrl}`);
const noTok = await fetch(mcpUrl, {
  method: "POST",
  redirect: "manual",
  headers: { "Content-Type": "application/json", Accept: "application/json,text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
if (noTok.status >= 300 && noTok.status < 400) bad(`MCP endpoint redirected (${noTok.status}) — clients POST here and will break; use the canonical domain`);
else if (noTok.status === 401) ok(`401 as expected; www-authenticate: ${noTok.headers.get("www-authenticate")}`);
else bad(`expected 401, got ${noTok.status} (is MCP_REQUIRE_AUTH=true?)`);

// 4. Optional: verify a real token exactly as the server does.
if (token) {
  console.log(`\n[4] Verifying pasted token against ${asMeta.jwks_uri}`);
  console.log("    token aud:", JSON.stringify(decodeJwt(token).aud));
  console.log("    token iss:", decodeJwt(token).iss);
  try {
    const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(asMeta.jwks_uri)), {
      issuer: authServer,
      audience: mcpUrl,
    });
    ok(`token verifies (sub=${payload.sub})`);
  } catch (e) {
    bad(`token FAILS the same check the server runs: ${e.message}`);
  }
}

console.log(failed ? "\nRESULT: ✗ misconfigured (see ✗ lines)\n" : "\nRESULT: ✓ all checks passed\n");
process.exit(failed ? 1 : 0);
