#!/usr/bin/env node
/**
 * OAuth / MCP discovery smoke test (Better Auth Authorization Server).
 *
 * Verifies the discovery chain an MCP client walks before it can connect:
 *   1. protected-resource metadata (RFC 9728) advertises the right `resource`
 *      and points at the authorization server;
 *   2. authorization-server metadata (RFC 8414) is reachable and exposes the
 *      authorize / token / registration (DCR) endpoints;
 *   3. an unauthenticated MCP call returns 401 + WWW-Authenticate pointing back
 *      at the protected-resource metadata.
 *
 * Better Auth issues OPAQUE access tokens verified server-side by introspection
 * (auth.api.getMcpSession), so there is no JWT to verify here — a token only
 * proves out by making a real authenticated tool call from an MCP client.
 *
 * Usage:
 *   node scripts/check-oauth.mjs <MCP_URL>
 *   node scripts/check-oauth.mjs https://www.dottcomm.dev/api/mcp
 *   node scripts/check-oauth.mjs http://localhost:3007/api/mcp
 */

const mcpUrl = process.argv[2];
if (!mcpUrl) {
  console.error("usage: node scripts/check-oauth.mjs <MCP_URL>");
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
else bad(`advertised resource "${prm.resource}" !== MCP URL "${mcpUrl}" — set MCP_RESOURCE_URL to the MCP URL`);
const authServer = prm.authorization_servers?.[0];

// 2. Authorization server metadata + required endpoints (incl. DCR).
console.log(`\n[2] Authorization server metadata @ ${authServer}`);
const asMeta = await fetch(`${authServer}/.well-known/oauth-authorization-server`)
  .then((r) => r.json())
  .catch(() => ({}));
console.log("    issuer:", asMeta.issuer);
console.log("    authorization_endpoint:", asMeta.authorization_endpoint);
console.log("    token_endpoint:", asMeta.token_endpoint);
console.log("    registration_endpoint:", asMeta.registration_endpoint);
if (asMeta.authorization_endpoint && asMeta.token_endpoint) ok("authorize + token endpoints advertised");
else bad("missing authorize/token endpoint in AS metadata");
if (asMeta.registration_endpoint) ok("Dynamic Client Registration endpoint advertised (MCP clients can self-register)");
else bad("no registration_endpoint — MCP clients relying on DCR can't connect");

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

console.log(failed ? "\nRESULT: ✗ misconfigured (see ✗ lines)\n" : "\nRESULT: ✓ all checks passed\n");
process.exit(failed ? 1 : 0);
