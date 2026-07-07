import "server-only";
import Stripe from "stripe";

// apiVersion omitted on purpose: the SDK pins the version its types match.
let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    stripe = new Stripe(key);
  }
  return stripe;
}
