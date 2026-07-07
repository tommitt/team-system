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
 */
const authkitDomain = process.env.AUTHKIT_DOMAIN ?? "";

const handler = protectedResourceHandler({
  authServerUrls: [authkitDomain],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
