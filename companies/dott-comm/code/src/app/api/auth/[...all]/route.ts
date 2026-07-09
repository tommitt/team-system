import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth catch-all: serves login, magic-link verify, OAuth discovery +
// JWKS, Dynamic Client Registration, the token endpoint, consent, and
// `/mcp/get-session` introspection. This is the app's single auth mount point
// (replaced the WorkOS `/auth/callback` route).
export const { GET, POST } = toNextJsHandler(auth);
