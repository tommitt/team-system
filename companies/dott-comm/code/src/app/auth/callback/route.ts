import { handleAuth } from "@workos-inc/authkit-nextjs";

// OAuth callback for the website's AuthKit sessions (same WorkOS environment
// that authorizes the MCP, so `user.id` matches the MCP token's `sub`).
export const GET = handleAuth({ returnPathname: "/upgrade" });
