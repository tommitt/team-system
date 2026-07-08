import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BillingShell } from "@/components/BillingShell";
import {
  getBillingRow,
  getDailyLimit,
  getTrialLimit,
  type Plan,
} from "@/lib/billing/gate";
import { openCustomerPortal } from "../upgrade/actions";

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
  const limit = getTrialLimit();
  // Trial is "upfront pool, then daily": once the pool is spent, usage is the
  // recurring daily allowance (resets at Rome midnight).
  const inDailyPhase = usage > limit;
  const dailyUsage = row?.daily_usage_count ?? 0;
  const dailyLimit = getDailyLimit();
  const trialUsageLabel = inDailyPhase
    ? `${Math.min(dailyUsage, dailyLimit)}/${dailyLimit} oggi`
    : `${Math.min(usage, limit)}/${limit}`;

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
          <dd>{plan === "trial" ? trialUsageLabel : usage}</dd>
        </div>

        {row?.stripe_customer_id ? (
          <form className="billing-cta-form" action={openCustomerPortal}>
            <button className="cta-btn cta-btn--big" type="submit">
              Gestisci abbonamento
            </button>
            <span className="billing-note">
              Fatture, metodo di pagamento e disdetta nel portale sicuro Stripe.
            </span>
          </form>
        ) : (
          <div className="billing-cta-form">
            <Link className="cta-btn cta-btn--big" href="/upgrade">
              Attiva l&apos;abbonamento
            </Link>
          </div>
        )}
      </div>
    </BillingShell>
  );
}
