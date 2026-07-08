import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed token that lets a paywalled MCP user reach Stripe Checkout
 * WITHOUT re-authenticating.
 *
 * The MCP server already verified the user's access token, so at paywall time
 * it knows the user id. We sign `{ sub, exp }` with a server secret and put it
 * in the upgrade URL (`/upgrade?t=…`). The upgrade page verifies it and starts
 * a checkout bound to that user id.
 *
 * Scope is deliberately narrow: this token authorizes STARTING a checkout only.
 * The Stripe customer portal (cancel / refund / invoices / change card) stays
 * behind a full sign-in — a leaked token can at most let someone pay for this
 * user's subscription with their own card.
 */

const TTL_SECONDS = 15 * 60;

function secret(): string | null {
  return (
    process.env.UPGRADE_TOKEN_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    null
  );
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

/**
 * Sign a token authorizing checkout for `userId`. Returns null when no secret
 * is configured (dev / tests) — callers then fall back to the plain `/upgrade`
 * URL and the normal sign-in flow.
 */
export function signUpgradeToken(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  const body = Buffer.from(
    JSON.stringify({ sub: userId, exp: nowSeconds() + TTL_SECONDS }),
  ).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

/** Verify a token; return the user id if valid and unexpired, else null. */
export function verifyUpgradeToken(token: string): string | null {
  const key = secret();
  if (!key) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  const expectedSig = sign(body, key);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < nowSeconds()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
