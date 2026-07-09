import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BillingShell } from "@/components/BillingShell";
import { getBillingRow, trialUsageView, type Plan } from "@/lib/billing/gate";
import { openCustomerPortal, startCheckout } from "../upgrade/actions";
import { signOut } from "./actions";

export const metadata = { title: "Account — DottComm" };

const PLAN_LABELS: Record<Plan, string> = {
  trial: "Prova gratuita",
  active: "Abbonamento attivo",
  past_due: "Pagamento non riuscito",
  canceled: "Abbonamento non attivo",
};

export default async function AccountPage() {
  // The proxy redirects signed-out visitors to /sign-in before this renders;
  // the redirect below is a belt-and-braces fallback if the optimistic cookie
  // check let a request through with no valid session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?returnTo=/account");
  const user = session.user;

  const row = await getBillingRow(user.id);
  const plan: Plan = row?.plan ?? "trial";
  const usage = row?.usage_count ?? 0;
  const trialUsage = trialUsageView({
    total: usage,
    daily: row?.daily_usage_count ?? 0,
  });

  return (
    <BillingShell>
      <span className="mono steps-kicker">account</span>
      <h1>Il tuo account</h1>
      <p className="billing-lede">
        Stato del piano e utilizzo degli strumenti DottComm.
      </p>

      <div className="billing-card">
        <div className="billing-row">
          <dt>Account</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="billing-row">
          <dt>Piano</dt>
          <dd>
            <span className="billing-plan-badge">{PLAN_LABELS[plan]}</span>
          </dd>
        </div>
        <div className="billing-row">
          <dt>Chiamate effettuate</dt>
          <dd>{plan === "trial" ? trialUsage.label : usage}</dd>
        </div>
        {plan === "trial" && (
          <div className="billing-usage-track">
            <div
              className="billing-usage-bar"
              style={{ width: `${trialUsage.pct}%` }}
            />
          </div>
        )}

        {row?.stripe_customer_id ? (
          <form className="billing-cta-form" action={openCustomerPortal}>
            <button className="cta-btn cta-btn--big" type="submit">
              Gestisci abbonamento su Stripe
            </button>
            <span className="billing-note">
              Fatture, metodo di pagamento e disdetta nel portale sicuro Stripe.
            </span>
          </form>
        ) : (
          <form className="billing-cta-form" action={startCheckout}>
            <button className="cta-btn cta-btn--big" type="submit">
              Attiva l&apos;abbonamento
            </button>
            <span className="billing-note">
              Pagamento sicuro con Stripe. Disdici quando vuoi.
            </span>
          </form>
        )}
      </div>

      <form className="billing-signout" action={signOut}>
        <button className="btn-outline" type="submit">
          Disconnetti
        </button>
      </form>
    </BillingShell>
  );
}
