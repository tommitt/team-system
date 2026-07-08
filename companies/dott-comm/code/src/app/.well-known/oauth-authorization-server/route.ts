import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 *
 * The protected-resource metadata advertises this site's origin as the
 * authorization server, so MCP clients fetch this well-known path at the root
 * to discover the authorize / token / registration endpoints (all served by
 * Better Auth under `/api/auth/mcp/*`). Delegated to Better Auth, with CORS for
 * browser-based clients; the handler ignores the method so it also answers the
 * OPTIONS preflight.
 */
const handler = oAuthDiscoveryMetadata(auth);

export { handler as GET, handler as OPTIONS };
