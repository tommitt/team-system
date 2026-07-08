import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AutoSubmit } from "@/components/AutoSubmit";
import { BillingShell } from "@/components/BillingShell";
import { getBillingRow, trialUsageView, type Plan } from "@/lib/billing/gate";
import { verifyUpgradeToken } from "@/lib/billing/upgrade-token";
import { openCustomerPortal, signIn, startCheckout } from "./actions";

export const metadata = { title: "Abbonamento — DottComm" };

const PLAN_LABELS: Record<Plan, string> = {
  trial: "Prova gratuita",
  active: "Abbonamento attivo",
  past_due: "Pagamento non riuscito",
  canceled: "Abbonamento non attivo",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; canceled?: string }>;
}) {
  const { t, canceled } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  // A signed session always wins; the token only matters when signed out. The
  // token lets a paywalled MCP user reach checkout without re-authenticating.
  const tokenUserId = !user && t ? verifyUpgradeToken(t) : null;
  const viaToken = !user && !!tokenUserId;
  const effectiveUserId = user?.id ?? tokenUserId;

  if (!effectiveUserId) {
    return (
      <BillingShell>
        <span className="mono steps-kicker">abbonamento</span>
        <h1>Accedi per gestire il tuo piano</h1>
        <p className="billing-lede">
          Usa lo stesso account con cui hai collegato l&apos;MCP di DottComm:
          così l&apos;abbonamento si attiva subito sui tuoi strumenti.
        </p>
        <form className="billing-cta-form" action={signIn}>
          <button className="cta-btn cta-btn--big" type="submit">
            Accedi
          </button>
        </form>
      </BillingShell>
    );
  }

  const row = await getBillingRow(effectiveUserId);
  const plan: Plan = row?.plan ?? "trial";
  const trialUsage = trialUsageView({
    total: row?.usage_count ?? 0,
    daily: row?.daily_usage_count ?? 0,
  });

  // active: nothing to buy. past_due: the subscription exists — a new checkout
  // would risk a second one; the fix (update the card) lives in the portal.
  const managedInPortal = plan === "active" || plan === "past_due";

  // A visitor who reached this page wants to subscribe — forward them straight
  // to Stripe Checkout instead of asking for one more click. Never when
  // returning from a canceled checkout (?canceled=1 would loop them back in),
  // and only when Stripe is actually configured.
  const autoCheckout =
    !canceled &&
    !managedInPortal &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_PRICE_ID;

  return (
    <BillingShell>
      <span className="mono steps-kicker">abbonamento</span>
      <h1>
        {plan === "active"
          ? "Il tuo abbonamento è attivo"
          : plan === "past_due"
            ? "Aggiorna il metodo di pagamento"
            : "Continua senza limiti"}
      </h1>
      <p className="billing-lede">
        {plan === "active"
          ? "Hai accesso illimitato agli strumenti di DottComm. Puoi gestire o disdire l'abbonamento in qualsiasi momento."
          : plan === "past_due"
            ? "L'ultimo pagamento del tuo abbonamento non è riuscito. Aggiorna il metodo di pagamento dal portale Stripe per non perdere l'accesso."
            : "La prova gratuita include un numero limitato di chiamate agli strumenti. Con l'abbonamento mensile usi DottComm senza limiti."}
      </p>

      <div className="billing-card">
        {user && (
          <div className="billing-row">
            <dt>Account</dt>
            <dd>{user.email}</dd>
          </div>
        )}
        <div className="billing-row">
          <dt>Piano</dt>
          <dd>
            <span className="billing-plan-badge">{PLAN_LABELS[plan]}</span>
          </dd>
        </div>
        {plan === "trial" && (
          <>
            <div className="billing-row">
              <dt>Utilizzo prova gratuita</dt>
              <dd>{trialUsage.label} chiamate</dd>
            </div>
            <div className="billing-usage-track">
              <div
                className="billing-usage-bar"
                style={{ width: `${trialUsage.pct}%` }}
              />
            </div>
          </>
        )}

        {managedInPortal ? (
          viaToken ? (
            // Managing a subscription requires the sensitive portal, which is
            // never reachable by token — send the user through a real login.
            <form className="billing-cta-form" action={signIn}>
              <button className="cta-btn cta-btn--big" type="submit">
                Accedi per gestire l&apos;abbonamento
              </button>
              <span className="billing-note">
                Per fatture, metodo di pagamento e disdetta accedi con il tuo
                account.
              </span>
            </form>
          ) : (
            <form className="billing-cta-form" action={openCustomerPortal}>
              <button className="cta-btn cta-btn--big" type="submit">
                Gestisci abbonamento
              </button>
              <span className="billing-note">
                Fatture, metodo di pagamento e disdetta nel portale sicuro
                Stripe.
              </span>
            </form>
          )
        ) : (
          <form className="billing-cta-form" action={startCheckout}>
            {viaToken && <input type="hidden" name="t" value={t} />}
            {autoCheckout && <AutoSubmit />}
            <button className="cta-btn cta-btn--big" type="submit">
              {plan === "canceled"
                ? "Riattiva l'abbonamento"
                : "Attiva l'abbonamento"}
            </button>
            <span className="billing-note">
              {autoCheckout
                ? "Ti stiamo portando al pagamento sicuro Stripe…"
                : "Pagamento sicuro con Stripe. Disdici quando vuoi."}
            </span>
          </form>
        )}
      </div>
    </BillingShell>
  );
}
