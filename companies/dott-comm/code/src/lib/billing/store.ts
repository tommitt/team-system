import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type { TablesUpdate } from "./database.types";
import type { Plan } from "./gate";

/**
 * Write-side helpers for the billing table, shared by the checkout server
 * actions and the Stripe webhook. All updates are idempotent so Stripe
 * webhook retries are safe.
 */

/** Lazy-provision a billing row without touching the usage counter. */
export async function ensureBillingRow(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function setStripeCustomer(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

/** checkout.session.completed → subscription is live. */
export async function activateSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string | null,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users_billing")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

/**
 * Set the plan for the row matching a Stripe customer id; falls back to the
 * app user id carried in Stripe metadata when the mapping isn't stored yet.
 * Returns false when no row matched (caller logs it).
 */
export async function setPlanByStripeCustomer(
  stripeCustomerId: string,
  plan: Plan,
  opts: { userIdFallback?: string; clearSubscriptionId?: boolean } = {},
): Promise<boolean> {
  const patch: TablesUpdate<"users_billing"> = {
    plan,
    updated_at: new Date().toISOString(),
  };
  if (opts.clearSubscriptionId) patch.stripe_subscription_id = null;

  const supabase = getSupabaseAdmin();
  const byCustomer = await supabase
    .from("users_billing")
    .update(patch)
    .eq("stripe_customer_id", stripeCustomerId)
    .select("user_id");
  if (byCustomer.error) throw byCustomer.error;
  if (byCustomer.data.length > 0) return true;

  if (opts.userIdFallback) {
    const byUser = await supabase
      .from("users_billing")
      .update({ ...patch, stripe_customer_id: stripeCustomerId })
      .eq("user_id", opts.userIdFallback)
      .select("user_id");
    if (byUser.error) throw byUser.error;
    return byUser.data.length > 0;
  }
  return false;
}
