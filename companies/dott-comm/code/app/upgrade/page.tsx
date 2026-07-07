import { withAuth } from "@workos-inc/authkit-nextjs";
import { BillingShell } from "@/components/BillingShell";
import { getBillingRow, getTrialLimit, type Plan } from "@/lib/billing/gate";
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
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const { user } = await withAuth();

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
  const usage = row?.usage_count ?? 0;
  const limit = getTrialLimit();
  const usagePct = Math.min(100, Math.round((usage / limit) * 100));

  return (
    <BillingShell>
      <span className="mono steps-kicker">abbonamento</span>
      <h1>
        {plan === "active"
          ? "Il tuo abbonamento è attivo"
          : "Continua senza limiti"}
      </h1>
      <p className="billing-lede">
        {plan === "active"
          ? "Hai accesso illimitato agli strumenti di DottComm. Puoi gestire o disdire l'abbonamento in qualsiasi momento."
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
              <dd>
                {Math.min(usage, limit)}/{limit} chiamate
              </dd>
            </div>
            <div className="billing-usage-track">
              <div
                className="billing-usage-bar"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </>
        )}

        {plan === "active" ? (
          viaToken ? (
            // Managing an active plan requires the sensitive portal, which is
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
            <button className="cta-btn cta-btn--big" type="submit">
              {plan === "past_due" || plan === "canceled"
                ? "Riattiva l'abbonamento"
                : "Attiva l'abbonamento"}
            </button>
            <span className="billing-note">
              Pagamento sicuro con Stripe. Disdici quando vuoi.
            </span>
          </form>
        )}
      </div>
    </BillingShell>
  );
}
