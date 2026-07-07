import "server-only";
import { getSupabaseAdmin } from "@/lib/billing/supabase";

/**
 * Per-call telemetry (ADR 0006): one `tool_events` row per gated tool call,
 * recorded at the `registerGatedTool` chokepoint. This is the passive half of
 * the feedback pipeline — the only session signal that ever reaches the server
 * is tool calls, so we observe them (metadata only: argument NAMES via
 * `argsKeys`, never values — ADR 0003 still holds, no fiscal data here).
 *
 * Fail open, never throw: telemetry must never block or degrade a tool result
 * (opposite polarity from the billing gate, which fails closed).
 */

export type ToolEvent = {
  userId: string;
  tool: string;
  sessionId?: string;
  outcome: "ok" | "error" | "blocked";
  latencyMs: number;
  argsKeys: string[];
};

export async function recordToolEvent(event: ToolEvent): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin().from("tool_events").insert({
      workos_user_id: event.userId,
      tool: event.tool,
      session_id: event.sessionId ?? null,
      outcome: event.outcome,
      latency_ms: Math.round(event.latencyMs),
      args_keys: event.argsKeys,
    });
    if (error) throw error;
  } catch (err) {
    console.error("Telemetry insert failed (ignored, fail open):", err);
  }
}
