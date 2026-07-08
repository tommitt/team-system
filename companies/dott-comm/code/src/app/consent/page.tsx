import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { BillingShell } from "@/components/BillingShell";
import { ConsentForm } from "@/components/ConsentForm";

export const metadata = { title: "Autorizza — DottComm" };

/**
 * OAuth consent page for MCP Dynamic Client Registration. Better Auth's OIDC
 * provider redirects here with `consent_code`, `client_id`, and `scope` after
 * the user signs in during the authorize flow. Requires a session (the user
 * must be signed in to grant consent).
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    consent_code?: string;
    client_id?: string;
    scope?: string;
  }>;
}) {
  const { consent_code, client_id, scope } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?returnTo=/account");

  // Without a consent code there's nothing to authorize — send them home.
  if (!consent_code) redirect("/account");

  const scopes = (scope ?? "").split(" ").filter(Boolean);

  return (
    <BillingShell>
      <span className="mono steps-kicker">autorizzazione</span>
      <h1>Autorizza l&apos;accesso</h1>
      <ConsentForm
        clientId={client_id ?? "un'applicazione"}
        scopes={scopes}
        consentCode={consent_code}
      />
    </BillingShell>
  );
}
