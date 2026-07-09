import { createAuthClient } from "better-auth/react";
import { magicLinkClient, oidcClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client for the sign-in and consent pages.
 * `oidcClient` adds `authClient.oauth2.consent(...)` used by the DCR consent
 * screen; `magicLinkClient` adds `authClient.signIn.magicLink(...)`.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), oidcClient()],
});
