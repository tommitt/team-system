"use server";

import { redirect } from "next/navigation";
import { getSignInUrl, withAuth } from "@workos-inc/authkit-nextjs";
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

/**
 * Start the AuthKit sign-in flow. Must be a server action: getSignInUrl sets
 * a PKCE cookie, which is illegal during server-component render.
 */
export async function signIn(): Promise<never> {
  redirect(await getSignInUrl({ returnTo: "/upgrade" }));
}

/**
 * Ensure the signed-in user has a Stripe customer, creating it lazily with
 * the WorkOS user id in metadata (the identity link between the two systems).
 */
async function getOrCreateStripeCustomer(
  workosUserId: string,
  email: string | null,
): Promise<string> {
  await ensureBillingRow(workosUserId);
  const row = await getBillingRow(workosUserId);
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { workos_user_id: workosUserId },
  });
  await setStripeCustomer(workosUserId, customer.id);
  return customer.id;
}

/**
 * Send the user to Stripe Checkout for the flat monthly subscription.
 *
 * Identity comes from one of two sources:
 *  - a signed upgrade token (`t` in the form), minted by the paywall so the
 *    user never has to re-login through AuthKit; or
 *  - the AuthKit session, when the page was opened while signed in.
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
    const { user } = await withAuth({ ensureSignedIn: true });
    userId = user.id;
    email = user.email;
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set.");

  const customer = await getOrCreateStripeCustomer(userId, email);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: { metadata: { workos_user_id: userId } },
    success_url: `${siteUrl()}/upgrade/success`,
    cancel_url: `${siteUrl()}/upgrade`,
  });
  redirect(session.url!);
}

/** Send the user to the Stripe Customer Portal (manage/cancel subscription). */
export async function openCustomerPortal(): Promise<never> {
  const { user } = await withAuth({ ensureSignedIn: true });

  const row = await getBillingRow(user.id);
  if (!row?.stripe_customer_id) redirect("/upgrade");

  const session = await getStripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${siteUrl()}/account`,
  });
  redirect(session.url);
}
