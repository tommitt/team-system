import { BillingShell } from "@/components/BillingShell";
import { SignInForm } from "@/components/SignInForm";

export const metadata = { title: "Accedi — DottComm" };

/** Only allow internal same-origin return paths (block open redirects). */
function safeReturnTo(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/account";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const callbackURL = safeReturnTo(returnTo);

  return (
    <BillingShell>
      <span className="mono steps-kicker">accedi</span>
      <h1>Accedi a DottComm</h1>
      <p className="billing-lede">
        Usa lo stesso account con cui colleghi l&apos;MCP di DottComm, così
        l&apos;abbonamento e gli strumenti restano allineati.
      </p>
      <SignInForm callbackURL={callbackURL} />
    </BillingShell>
  );
}
