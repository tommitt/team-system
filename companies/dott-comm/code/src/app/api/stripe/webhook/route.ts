import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/billing/gate";
import {
  activateSubscription,
  setPlanByStripeCustomer,
} from "@/lib/billing/store";

/**
 * Stripe webhook → plan transitions in Supabase (ADR 0002). Because the MCP
 * gate reads the DB on every tool call, a flip here takes effect on the
 * user's very next call — no token refresh involved.
 *
 * Responses: bad signature → 400; DB failure → 500 (Stripe retries; all
 * writes are idempotent); unknown events → 200 and ignored.
 */

const SUBSCRIPTION_STATUS_TO_PLAN: Partial<Record<Stripe.Subscription.Status, Plan>> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "canceled",
  incomplete_expired: "canceled",
  // `incomplete` (checkout never finished) is intentionally ignored.
};

function customerId(ref: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  return typeof ref === "string" ? ref : (ref?.id ?? null);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customer = customerId(session.customer);
  let userId = session.client_reference_id ?? null;
  if (!userId && customer) {
    const c = await getStripe().customers.retrieve(customer);
    if (!c.deleted) userId = c.metadata.app_user_id ?? null;
  }
  if (!userId || !customer) {
    console.error("checkout.session.completed without a resolvable user:", session.id);
    return;
  }
  const subscription =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  await activateSubscription(userId, customer, subscription);
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  deleted: boolean,
) {
  const customer = customerId(sub.customer);
  if (!customer) return;
  const plan = deleted ? "canceled" : SUBSCRIPTION_STATUS_TO_PLAN[sub.status];
  if (!plan) return;
  const matched = await setPlanByStripeCustomer(customer, plan, {
    userIdFallback: sub.metadata?.app_user_id,
    clearSubscriptionId: deleted,
  });
  if (!matched) {
    console.error("Stripe subscription event matched no billing row:", sub.id);
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.text(); // raw body, required for signature verification
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object, false);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object, true);
        break;
      default:
        break; // not subscribed to anything else; acknowledge and ignore
    }
  } catch (err) {
    console.error(`Stripe webhook ${event.type} failed:`, err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
