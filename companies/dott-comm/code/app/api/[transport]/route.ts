import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { registerTools } from "@/lib/mcp/tools";

/**
 * Dott. Comm. MCP server.
 *
 * Served from this Next.js app as a route handler, so it deploys on Vercel
 * alongside the website (one project, one domain). The `[transport]` segment
 * lets mcp-handler serve both `/api/mcp` (Streamable HTTP) and `/api/sse`.
 *
 * Auth: OAuth 2.1 resource server. WorkOS AuthKit is the Authorization Server
 * (it issues tokens and handles login / Dynamic Client Registration); this
 * server only *verifies* the incoming bearer JWT against AuthKit's JWKS. See
 * `app/.well-known/oauth-protected-resource/route.ts` for the discovery
 * metadata that points clients at AuthKit.
 *
 * Enforcement is gated by `MCP_REQUIRE_AUTH=true`. Required env when on:
 *   - AUTHKIT_DOMAIN     e.g. https://your-app.authkit.app  (issuer + JWKS base)
 *   - MCP_RESOURCE_URL   this server's public MCP URL, the token audience
 *                        e.g. https://dott-comm.vercel.app/api/mcp
 */
const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {},
  { basePath: "/api" },
);

const requireAuth = process.env.MCP_REQUIRE_AUTH === "true";

// JWKS set is cached across invocations by `jose`. Lazily created so a missing
// AUTHKIT_DOMAIN doesn't throw at import time when auth is disabled.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks(authkitDomain: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/oauth2/jwks", authkitDomain));
  }
  return jwks;
}

// Verify a WorkOS AuthKit access token (a JWT) and map it to MCP AuthInfo.
// Returning undefined causes `withMcpAuth` to reject when `required` is true.
const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const authkitDomain = process.env.AUTHKIT_DOMAIN;
  const audience = process.env.MCP_RESOURCE_URL;
  if (!authkitDomain || !audience) {
    // Misconfiguration: fail closed rather than accept unverifiable tokens.
    console.error(
      "MCP auth is enabled but AUTHKIT_DOMAIN / MCP_RESOURCE_URL are not set.",
    );
    return undefined;
  }

  try {
    const { payload } = await jwtVerify(bearerToken, getJwks(authkitDomain), {
      issuer: authkitDomain,
      audience,
    });

    const scopes =
      typeof payload.scope === "string" ? payload.scope.split(" ") : [];

    return {
      token: bearerToken,
      clientId: (payload.azp as string) ?? (payload.client_id as string) ?? "",
      scopes,
      extra: { userId: payload.sub },
    };
  } catch (err) {
    console.warn("MCP token verification failed:", err);
    return undefined;
  }
};

const authedHandler = withMcpAuth(handler, verifyToken, {
  required: requireAuth,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
