import { betterAuth } from "better-auth";
import { magicLink, mcp } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { Resend } from "resend";

/**
 * Better Auth is both the website's session provider AND the OAuth 2.1
 * Authorization Server for the MCP (it replaced WorkOS AuthKit — see ADR 0012,
 * which supersedes 0001). It runs in-process and stores its tables in the same
 * Supabase Postgres as billing, reached over a direct `pg` connection (not
 * PostgREST), so the billing table's zero-policy RLS doesn't apply to it.
 *
 * Two roles:
 *  - Website sessions: email magic link only (no passwords, no external IdP).
 *    Read with `auth.api.getSession({ headers })` in server components/actions.
 *  - MCP Authorization Server: the `mcp` plugin exposes OAuth discovery, DCR,
 *    the token endpoint, and `/mcp/get-session` introspection. Access tokens
 *    are OPAQUE (random strings in `oauthAccessToken`), so the MCP resource
 *    server verifies them by introspection via `auth.api.getMcpSession`, not by
 *    decoding a JWT (see `app/api/[transport]/route.ts`).
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const MAGIC_LINK_FROM =
  process.env.MAGIC_LINK_FROM ?? "DottComm <onboarding@resend.dev>";

async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!resend) {
    // No email provider configured (dev/tests): log the link so a developer can
    // still complete sign-in locally rather than silently dropping it.
    console.warn(`[magic-link] RESEND_API_KEY unset — link for ${email}: ${url}`);
    return;
  }
  await resend.emails.send({
    from: MAGIC_LINK_FROM,
    to: email,
    subject: "Accedi a DottComm",
    html:
      `<p>Ciao,</p><p>Per accedere a DottComm clicca il link qui sotto ` +
      `(scade tra pochi minuti):</p>` +
      `<p><a href="${url}">Accedi a DottComm</a></p>` +
      `<p>Se non hai richiesto questo accesso, ignora questa email.</p>`,
  });
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  // Passwordless: email magic link only (no external IdP to configure — add
  // Google later if users ask; see ADR 0012).
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    mcp({
      loginPage: "/sign-in",
      // Binds issued tokens to this resource and advertises it in the
      // protected-resource metadata. Must equal MCP_RESOURCE_URL used by the
      // resource server.
      resource: process.env.MCP_RESOURCE_URL,
      oidcConfig: {
        loginPage: "/sign-in",
        consentPage: "/consent",
        allowDynamicClientRegistration: true,
      },
    }),
    // Must be last: lets Better Auth set cookies from Next.js server actions.
    nextCookies(),
  ],
});
