"use server";

import { redirect } from "next/navigation";
import { getSignInUrl, withAuth } from "@workos-inc/authkit-nextjs";
import { getStripe } from "@/lib/stripe";
import { getBillingRow } from "@/lib/billing/gate";
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

/** Send the user to Stripe Checkout for the flat monthly subscription. */
export async function startCheckout(): Promise<never> {
  const { user } = await withAuth({ ensureSignedIn: true });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set.");

  const customer = await getOrCreateStripeCustomer(user.id, user.email);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { workos_user_id: user.id } },
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
