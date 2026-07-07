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
// Server-level instructions (MCP `initialize` result): the feedback protocol
// that makes `invia_feedback` fire without the user knowing the tool exists.
const INSTRUCTIONS = [
  "Dott. Comm. automatizza il lavoro dello studio commercialista italiano: raccolta documenti, " +
    "estrazione dati, prospetti degli acconti, ravvedimento operoso e comunicazioni ai clienti. " +
    "Ogni output è una BOZZA: la decisione resta del professionista.",
  "",
  "PROTOCOLLO FEEDBACK — importante: se l'utente chiede qualcosa che questi strumenti non sanno " +
    "fare, vorrebbe un risultato diverso da quello prodotto, o esprime attrito o frustrazione, " +
    "proponi di segnalarlo al team con il tool `invia_feedback` e invialo dopo il suo consenso. " +
    "Non includere mai dati fiscali dei clienti dello studio nel feedback.",
].join("\n");

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  { instructions: INSTRUCTIONS },
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
    // Log the mismatch explicitly: the most common cause is the token's `aud`
    // or `iss` not matching what we expect (domain/path drift between the
    // metadata resource, MCP_RESOURCE_URL, and the WorkOS Resource Indicator).
    // Decode without verifying just to surface the claims — never trust these.
    let claims: unknown;
    try {
      claims = JSON.parse(
        Buffer.from(bearerToken.split(".")[1] ?? "", "base64url").toString(),
      );
    } catch {
      claims = "<unparseable JWT payload>";
    }
    console.warn("MCP token verification failed:", (err as Error)?.message, {
      expected: { issuer: authkitDomain, audience },
      tokenClaims: claims,
    });
    return undefined;
  }
};

const authedHandler = withMcpAuth(handler, verifyToken, {
  required: requireAuth,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
