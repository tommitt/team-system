import { authkitProxy } from "@workos-inc/authkit-nextjs";

/**
 * AuthKit session handling for the website's account/billing pages (Next 16
 * renamed `middleware.ts` to `proxy.ts`).
 *
 * The matcher is an explicit allowlist: it must NEVER cover `/api/*` or
 * `/.well-known/*` — the MCP endpoint and its OAuth discovery metadata do
 * their own bearer-token auth and would break behind AuthKit's session logic.
 */
export default authkitProxy({
  middlewareAuth: {
    // Signed-out visitors on matched paths are redirected to AuthKit by the
    // proxy (cookie writes are only legal here, not in server components).
    enabled: true,
    // /upgrade stays public: it renders its own sign-in CTA.
    unauthenticatedPaths: ["/upgrade", "/upgrade/success"],
  },
});

export const config = {
  matcher: ["/upgrade/:path*", "/account/:path*"],
};
