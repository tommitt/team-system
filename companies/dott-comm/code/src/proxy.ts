import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Session guard for the website's authenticated pages (Next 16 renamed
 * `middleware.ts` to `proxy.ts`). Replaced WorkOS AuthKit's `authkitProxy`.
 *
 * This is an OPTIMISTIC check: `getSessionCookie` only confirms a session
 * cookie is present, not that it's valid — the server components behind it
 * re-validate via `auth.api.getSession`. That's the recommended Better Auth
 * pattern (no DB round trip in the proxy).
 *
 * The matcher is an explicit allowlist and must NEVER cover `/api/*` or
 * `/.well-known/*`: the MCP endpoint, its OAuth discovery metadata, and the
 * Better Auth catch-all at `/api/auth/*` all do their own auth and would break
 * behind this session logic. `/upgrade` stays public (it renders its own
 * sign-in CTA), so only `/account` is guarded here.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
