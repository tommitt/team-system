import Link from "next/link";
import { BillingShell } from "@/components/BillingShell";

export const metadata = { title: "Abbonamento attivato — DottComm" };

// Static thank-you. Entitlement is flipped by the Stripe webhook (seconds) —
// this page is never the source of truth for plan state.
export default function UpgradeSuccessPage() {
  return (
    <BillingShell>
      <span className="mono steps-kicker">abbonamento</span>
      <h1>Grazie! Abbonamento attivato</h1>
      <p className="billing-lede">
        L&apos;attivazione richiede pochi secondi: alla prossima richiesta i
        tuoi strumenti DottComm saranno di nuovo senza limiti. Non serve
        riconnettere l&apos;MCP.
      </p>
      <div className="billing-cta-form">
        <Link className="cta-btn cta-btn--big" href="/account">
          Vai al tuo account
        </Link>
        <span className="billing-note">
          Ricevuta e fattura arrivano via email da Stripe.
        </span>
      </div>
    </BillingShell>
  );
}
