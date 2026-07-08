"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getBillingRow } from "@/lib/billing/gate";
import { verifyUpgradeToken } from "@/lib/billing/upgrade-token";
import { ensureBillingRow, setStripeCustomer } from "@/lib/billing/store";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Resolve the signed-in user, or redirect to the sign-in page. */
async function requireUser(): Promise<{ id: string; email: string | null }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?returnTo=/upgrade");
  return { id: session.user.id, email: session.user.email ?? null };
}

/** Start the sign-in flow (used by the signed-out CTA on /upgrade). */
export async function signIn(): Promise<never> {
  redirect("/sign-in?returnTo=/upgrade");
}

/**
 * Ensure the signed-in user has a Stripe customer, creating it lazily with
 * the app user id in metadata (the identity link between the two systems).
 */
async function getOrCreateStripeCustomer(
  userId: string,
  email: string | null,
): Promise<string> {
  await ensureBillingRow(userId);
  const row = await getBillingRow(userId);
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { app_user_id: userId },
  });
  await setStripeCustomer(userId, customer.id);
  return customer.id;
}

/**
 * Send the user to Stripe Checkout for the flat monthly subscription.
 *
 * Identity comes from one of two sources:
 *  - a signed upgrade token (`t` in the form), minted by the paywall so the
 *    user never has to re-login; or
 *  - the Better Auth session, when the page was opened while signed in.
 * Checkout is the only capability the token grants — the portal stays gated.
 */
export async function startCheckout(formData?: FormData): Promise<never> {
  const token = formData?.get("t");
  const tokenUserId =
    typeof token === "string" ? verifyUpgradeToken(token) : null;

  let userId: string;
  let email: string | null;
  if (tokenUserId) {
    userId = tokenUserId;
    email = null; // Stripe Checkout collects the email itself.
  } else {
    const user = await requireUser();
    userId = user.id;
    email = user.email;
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set.");

  // Cancel must NOT land on a page that auto-forwards back into checkout
  // (redirect loop): ?canceled=1 disables the auto-forward. Keep the token so
  // a paywall visitor still sees their plan instead of the sign-in prompt.
  const cancelUrl = new URL(`${siteUrl()}/upgrade`);
  cancelUrl.searchParams.set("canceled", "1");
  if (tokenUserId && typeof token === "string") {
    cancelUrl.searchParams.set("t", token);
  }

  const customer = await getOrCreateStripeCustomer(userId, email);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: { metadata: { app_user_id: userId } },
    success_url: `${siteUrl()}/upgrade/success`,
    cancel_url: cancelUrl.toString(),
  });
  redirect(session.url!);
}

/** Send the user to the Stripe Customer Portal (manage/cancel subscription). */
export async function openCustomerPortal(): Promise<never> {
  const user = await requireUser();

  const row = await getBillingRow(user.id);
  if (!row?.stripe_customer_id) redirect("/upgrade");

  const session = await getStripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${siteUrl()}/account`,
  });
  redirect(session.url);
}
