import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * MCP clients hit this to discover which Authorization Server can issue tokens
 * for this MCP server. We delegate to Better Auth (the in-process AS): the
 * metadata advertises the `resource` configured on the `mcp` plugin
 * (MCP_RESOURCE_URL) and points clients at Better Auth's authorization-server
 * metadata. The handler sets permissive CORS so browser-based clients can read
 * it; it ignores the HTTP method, so it also answers the OPTIONS preflight.
 */
const handler = oAuthProtectedResourceMetadata(auth);

export { handler as GET, handler as OPTIONS };
