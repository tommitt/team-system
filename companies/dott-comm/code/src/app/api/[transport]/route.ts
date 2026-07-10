import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { auth } from "@/lib/auth";
import { registerTools } from "@/lib/mcp/tools";

/**
 * Dott. Comm. MCP server.
 *
 * Served from this Next.js app as a route handler, so it deploys on Vercel
 * alongside the website (one project, one domain). The `[transport]` segment
 * lets mcp-handler serve both `/api/mcp` (Streamable HTTP) and `/api/sse`.
 *
 * Auth: OAuth 2.1 resource server. Better Auth (in-process) is the Authorization
 * Server — it handles login, Dynamic Client Registration, and token issuance
 * (see `lib/auth.ts`). Better Auth issues OPAQUE access tokens (random strings
 * in `oauthAccessToken`), so this server verifies a bearer by INTROSPECTION via
 * `auth.api.getMcpSession` — not by decoding a JWT. Audience/resource binding is
 * enforced by the AS at issue time (the `resource` option in `lib/auth.ts`), so
 * there is no `aud` claim for the resource server to re-check.
 *
 * Enforcement is gated by `MCP_REQUIRE_AUTH=true`.
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
  "",
  "GROUNDING DELLE DOMANDE PUNTUALI — per qualsiasi domanda fiscale di merito (aliquote, " +
    "adempimenti, casi specifici) NON rispondere a memoria: chiama prima `corpus_cerca` e fonda " +
    "la risposta sui risultati, citandone sempre estremi, sezione e pagina. Se il corpus non " +
    "copre l'anno d'imposta chiesto o non trova nulla di pertinente, dillo esplicitamente invece " +
    "di indovinare. Usa `corpus_norma` per il testo di una norma citata e `corpus_leggi` per il " +
    "contesto attorno a un risultato.",
].join("\n");

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  { instructions: INSTRUCTIONS },
  { basePath: "/api" },
);

const requireAuth = process.env.MCP_REQUIRE_AUTH === "true";

// Verify a Better Auth access token by introspection and map it to MCP
// AuthInfo. `getMcpSession` reads the Bearer token from the request headers,
// looks it up in `oauthAccessToken`, and rejects expired/unknown tokens.
// Returning undefined makes `withMcpAuth` reject when `required` is true.
const verifyToken = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  try {
    const session = await auth.api.getMcpSession({ headers: req.headers });
    if (!session) return undefined;

    return {
      token: bearerToken,
      clientId: session.clientId ?? "",
      scopes: session.scopes ? session.scopes.split(" ") : [],
      // `userId` is read downstream by the billing gate
      // (`lib/mcp/register-gated-tool.ts`) as `extra.authInfo.extra.userId`.
      extra: { userId: session.userId },
    };
  } catch (err) {
    console.warn("MCP token introspection failed:", (err as Error)?.message);
    return undefined;
  }
};

const authedHandler = withMcpAuth(handler, verifyToken, {
  required: requireAuth,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
