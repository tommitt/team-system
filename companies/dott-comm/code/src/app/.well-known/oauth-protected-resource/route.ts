import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * MCP clients hit this to discover which Authorization Server can issue tokens
 * for this MCP server. We delegate to WorkOS AuthKit: set AUTHKIT_DOMAIN to
 * your AuthKit domain, e.g. https://your-app.authkit.app.
 *
 * `resourceUrl` MUST be passed explicitly and equal `MCP_RESOURCE_URL` (the
 * token audience `verifyToken` checks). Without it, mcp-handler derives the
 * resource from the request origin (dropping `/api/mcp`) — so clients request a
 * token for the bare origin while the server demands the full MCP URL, and
 * every token fails the audience check. The value here, the audience in
 * `app/api/[transport]/route.ts`, and the Resource Indicator registered in
 * WorkOS must all be byte-for-byte identical.
 */
const authkitDomain = process.env.AUTHKIT_DOMAIN ?? "";
const resourceUrl = process.env.MCP_RESOURCE_URL ?? "";

const handler = protectedResourceHandler({
  authServerUrls: [authkitDomain],
  resourceUrl,
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
