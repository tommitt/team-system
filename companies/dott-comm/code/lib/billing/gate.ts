import "server-only";
import { getSupabaseAdmin } from "./supabase";

/**
 * The paywall gate (ADR 0002).
 *
 * Every gated MCP tool call does exactly one round trip here: the
 * `increment_usage` RPC atomically lazy-provisions the user's billing row and
 * bumps the counter, returning the new count + plan. `decide` then turns that
 * into a GateDecision. Blocked calls are answered in-band by the caller (a
 * normal tool result with an upgrade message) — never a 401/403.
 *
 * Fail closed: if Supabase is unreachable the call is blocked with a friendly
 * temporary-error message rather than running unmetered.
 */

export type Plan = "trial" | "active" | "past_due" | "canceled";

export type GateDecision = {
  allowed: boolean;
  plan: Plan | "unknown"; // "unknown" on DB error
  usageCount: number;
  limit: number;
  /** Appended to the tool result when usage nears the limit or payment is past due. */
  warning?: string;
  /** Replaces the tool result when the call is blocked. */
  blockedMessage?: string;
};

export type BillingRow = {
  workos_user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  usage_count: number;
  trial_started_at: string;
};

const DEFAULT_TRIAL_LIMIT = 50;
const WARN_RATIO = 0.8;

export function getTrialLimit(): number {
  const parsed = Number(process.env.TRIAL_TOOL_CALL_LIMIT);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TRIAL_LIMIT;
}

function upgradeUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dott-comm.vercel.app";
  return `${site.replace(/\/$/, "")}/upgrade`;
}

const DB_ERROR_MESSAGE =
  "Si è verificato un problema temporaneo nel verificare il tuo account. " +
  "Riprova tra qualche istante.";

/** Pure decision function — kept separate so paid caps can be added later. */
export function decide(
  plan: Plan,
  usageCount: number,
  limit: number,
): GateDecision {
  const base = { plan, usageCount, limit };

  switch (plan) {
    case "active":
      return { ...base, allowed: true };
    case "past_due":
      return {
        ...base,
        allowed: true,
        warning:
          "⚠️ Risulta un problema con l'ultimo pagamento del tuo abbonamento. " +
          `Aggiorna il metodo di pagamento per non perdere l'accesso: ${upgradeUrl()}`,
      };
    case "canceled":
      return {
        ...base,
        allowed: false,
        blockedMessage:
          "Il tuo abbonamento a Dott. Comm. non è attivo. " +
          `Per riattivarlo e continuare a usare gli strumenti: ${upgradeUrl()}`,
      };
    case "trial": {
      if (usageCount > limit) {
        return {
          ...base,
          allowed: false,
          blockedMessage:
            `Il periodo di prova gratuito di Dott. Comm. è terminato (${limit} chiamate). ` +
            `Per continuare senza limiti, attiva l'abbonamento: ${upgradeUrl()}`,
        };
      }
      if (usageCount >= Math.ceil(limit * WARN_RATIO)) {
        return {
          ...base,
          allowed: true,
          warning:
            `ℹ️ Hai usato ${usageCount}/${limit} chiamate della prova gratuita di Dott. Comm. ` +
            `Per continuare senza limiti: ${upgradeUrl()}`,
        };
      }
      return { ...base, allowed: true };
    }
  }
}

/**
 * Record one tool call for the user and decide whether it may proceed.
 * One RPC round trip; the increment happens even for blocked calls (harmless —
 * the row is already past the limit).
 */
export async function checkAndRecordUsage(
  workosUserId: string,
): Promise<GateDecision> {
  const limit = getTrialLimit();
  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc("increment_usage", { p_workos_user_id: workosUserId })
      .single<{ usage_count: number; plan: Plan }>();
    if (error || !data) throw error ?? new Error("increment_usage returned no row");
    return decide(data.plan, data.usage_count, limit);
  } catch (err) {
    console.error("Billing gate failed (blocking call, fail closed):", err);
    return {
      allowed: false,
      plan: "unknown",
      usageCount: 0,
      limit,
      blockedMessage: DB_ERROR_MESSAGE,
    };
  }
}

/** Read-only billing row lookup (for the website's upgrade/account pages). */
export async function getBillingRow(
  workosUserId: string,
): Promise<BillingRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("users_billing")
    .select(
      "workos_user_id, stripe_customer_id, stripe_subscription_id, plan, usage_count, trial_started_at",
    )
    .eq("workos_user_id", workosUserId)
    .maybeSingle<BillingRow>();
  if (error) throw error;
  return data;
}
