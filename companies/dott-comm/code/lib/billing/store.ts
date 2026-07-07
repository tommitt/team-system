import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type { Plan } from "./gate";

/**
 * Write-side helpers for the billing table, shared by the checkout server
 * actions and the Stripe webhook. All updates are idempotent so Stripe
 * webhook retries are safe.
 */

/** Lazy-provision a billing row without touching the usage counter. */
export async function ensureBillingRow(workosUserId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .upsert(
      { workos_user_id: workosUserId },
      { onConflict: "workos_user_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function setStripeCustomer(
  workosUserId: string,
  stripeCustomerId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
    .eq("workos_user_id", workosUserId);
  if (error) throw error;
}

/** checkout.session.completed → subscription is live. */
export async function activateSubscription(
  workosUserId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string | null,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .upsert(
      {
        workos_user_id: workosUserId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workos_user_id" },
    );
  if (error) throw error;
}

/**
 * Set the plan for the row matching a Stripe customer id; falls back to the
 * workos_user_id carried in Stripe metadata when the mapping isn't stored yet.
 * Returns false when no row matched (caller logs it).
 */
export async function setPlanByStripeCustomer(
  stripeCustomerId: string,
  plan: Plan,
  opts: { workosUserIdFallback?: string; clearSubscriptionId?: boolean } = {},
): Promise<boolean> {
  const patch: Record<string, unknown> = {
    plan,
    updated_at: new Date().toISOString(),
  };
  if (opts.clearSubscriptionId) patch.stripe_subscription_id = null;

  const supabase = getSupabaseAdmin();
  const byCustomer = await supabase
    .from("users_billing")
    .update(patch)
    .eq("stripe_customer_id", stripeCustomerId)
    .select("workos_user_id");
  if (byCustomer.error) throw byCustomer.error;
  if (byCustomer.data.length > 0) return true;

  if (opts.workosUserIdFallback) {
    const byUser = await supabase
      .from("users_billing")
      .update({ ...patch, stripe_customer_id: stripeCustomerId })
      .eq("workos_user_id", opts.workosUserIdFallback)
      .select("workos_user_id");
    if (byUser.error) throw byUser.error;
    return byUser.data.length > 0;
  }
  return false;
}
