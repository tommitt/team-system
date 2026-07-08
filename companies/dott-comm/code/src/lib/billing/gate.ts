import "server-only";
import { getSupabaseAdmin } from "./supabase";
import { signUpgradeToken } from "./upgrade-token";

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
  /** Calls made today (Europe/Rome) and the recurring daily allowance. */
  dailyUsageCount?: number;
  dailyLimit?: number;
  /** Appended to the tool result when usage nears the limit or payment is past due. */
  warning?: string;
  /** Replaces the tool result when the call is blocked. */
  blockedMessage?: string;
};

export type BillingRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  usage_count: number;
  daily_usage_count: number;
  daily_usage_date: string;
  trial_started_at: string;
};

/** Trial = "50 upfront, then 20/day" (see migration 00002). */
const DEFAULT_TRIAL_LIMIT = 50;
const DEFAULT_DAILY_LIMIT = 20;
const WARN_RATIO = 0.8;

export type TrialLimits = { total: number; daily: number };
export type TrialUsage = { total: number; daily: number };

function envLimit(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** The upfront lifetime pool: calls usable at any pace before the daily cap. */
export function getTrialLimit(): number {
  return envLimit("TRIAL_TOOL_CALL_LIMIT", DEFAULT_TRIAL_LIMIT);
}

/** The recurring daily allowance once the upfront pool is spent. */
export function getDailyLimit(): number {
  return envLimit("DAILY_TOOL_CALL_LIMIT", DEFAULT_DAILY_LIMIT);
}

export function getTrialLimits(): TrialLimits {
  return { total: getTrialLimit(), daily: getDailyLimit() };
}

/**
 * The paywall upgrade link. When we know the user id we append a short-lived
 * signed token so the upgrade page can go straight to checkout without a
 * re-login (see upgrade-token.ts).
 */
function upgradeUrl(userId?: string): string {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dottcomm.dev"
  ).replace(/\/$/, "");
  const base = `${site}/upgrade`;
  if (!userId) return base;
  const token = signUpgradeToken(userId);
  return token ? `${base}?t=${token}` : base;
}

const DB_ERROR_MESSAGE =
  "Si è verificato un problema temporaneo nel verificare il tuo account. " +
  "Riprova tra qualche istante.";

/**
 * Pure decision function — kept separate so paid caps can be added later.
 * `userId`, when passed, is embedded in a signed token in the upgrade URL so
 * the paywall link skips re-login.
 *
 * Trial model is "50 upfront, then 20/day": while lifetime usage is within the
 * upfront pool (`limits.total`) any pace is fine; once it's spent the user is
 * gated by a recurring daily allowance (`limits.daily`, resets at Rome midnight —
 * the daily counter is maintained by the `increment_usage` RPC).
 */
export function decide(
  plan: Plan,
  usage: TrialUsage,
  limits: TrialLimits,
  userId?: string,
): GateDecision {
  const base = {
    plan,
    usageCount: usage.total,
    limit: limits.total,
    dailyUsageCount: usage.daily,
    dailyLimit: limits.daily,
  };
  const upgrade = upgradeUrl(userId);

  switch (plan) {
    case "active":
      return { ...base, allowed: true };
    case "past_due":
      return {
        ...base,
        allowed: true,
        warning:
          "⚠️ Risulta un problema con l'ultimo pagamento del tuo abbonamento. " +
          `Aggiorna il metodo di pagamento per non perdere l'accesso: ${upgrade}`,
      };
    case "canceled":
      return {
        ...base,
        allowed: false,
        blockedMessage:
          "Il tuo abbonamento a Dott. Comm. non è attivo. " +
          `Per riattivarlo e continuare a usare gli strumenti: ${upgrade}`,
      };
    case "trial": {
      // Phase 1 — the upfront lifetime pool, usable at any pace.
      if (usage.total <= limits.total) {
        if (usage.total >= Math.ceil(limits.total * WARN_RATIO)) {
          return {
            ...base,
            allowed: true,
            warning:
              `ℹ️ Hai usato ${usage.total}/${limits.total} chiamate del credito iniziale gratuito di Dott. Comm. ` +
              `Dopo passerai a ${limits.daily} chiamate gratuite al giorno; per usare senza limiti attiva l'abbonamento: ${upgrade}`,
          };
        }
        return { ...base, allowed: true };
      }
      // Phase 2 — recurring daily allowance (resets at midnight, Europe/Rome).
      if (usage.daily > limits.daily) {
        return {
          ...base,
          allowed: false,
          blockedMessage:
            `Hai raggiunto il limite giornaliero di chiamate gratuite di Dott. Comm. (${limits.daily} al giorno). ` +
            `Torna domani, oppure attiva l'abbonamento per continuare senza limiti: ${upgrade}`,
        };
      }
      if (usage.daily >= Math.ceil(limits.daily * WARN_RATIO)) {
        return {
          ...base,
          allowed: true,
          warning:
            `ℹ️ Hai usato ${usage.daily}/${limits.daily} chiamate gratuite di oggi. ` +
            `Al termine potrai continuare domani, oppure attiva l'abbonamento per non avere limiti: ${upgrade}`,
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
  userId: string,
): Promise<GateDecision> {
  const limits = getTrialLimits();
  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc("increment_usage", { p_user_id: userId })
      .single<{ usage_count: number; daily_usage_count: number; plan: Plan }>();
    if (error || !data) throw error ?? new Error("increment_usage returned no row");
    return decide(
      data.plan,
      { total: data.usage_count, daily: data.daily_usage_count },
      limits,
      userId,
    );
  } catch (err) {
    console.error("Billing gate failed (blocking call, fail closed):", err);
    return {
      allowed: false,
      plan: "unknown",
      usageCount: 0,
      limit: limits.total,
      dailyUsageCount: 0,
      dailyLimit: limits.daily,
      blockedMessage: DB_ERROR_MESSAGE,
    };
  }
}

/** Read-only billing row lookup (for the website's upgrade/account pages). */
export async function getBillingRow(
  userId: string,
): Promise<BillingRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("users_billing")
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, plan, usage_count, daily_usage_count, daily_usage_date, trial_started_at",
    )
    .eq("user_id", userId)
    .maybeSingle<BillingRow>();
  if (error) throw error;
  return data;
}
