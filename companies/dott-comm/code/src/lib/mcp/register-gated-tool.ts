import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { checkAndRecordUsage } from "@/lib/billing/gate";
import { recordToolEvent } from "./telemetry";

/**
 * Registers a tool through the billing gate (ADR 0002): each call atomically
 * records usage in Supabase and is blocked in-band (a normal tool result with an
 * upgrade message — never a 401/403) once the free trial is exhausted or the
 * subscription is inactive.
 *
 * Each call also records one telemetry event (ADR 0006) — tool name, outcome,
 * latency, argument NAMES (never values). Telemetry failures are swallowed;
 * only the billing gate can block a call. Note: Zod validation failures are
 * rejected by the MCP SDK before this wrapper runs, so they aren't captured.
 *
 * The user id comes from the verified access token (`extra.authInfo.extra.userId`,
 * set in `app/api/[transport]/route.ts`). Dev escape hatches when auth is off:
 * set `MCP_DEV_USER_ID` to exercise the gate against a fake user, or leave it
 * unset to run ungated (so the pure fiscal tools work without Supabase).
 *
 * Every capability registers through this — see the per-capability modules under
 * `lib/mcp/skills` and `lib/mcp/loops`, composed by `registerTools`. The single
 * deliberate exception is `invia_feedback` (`lib/mcp/feedback.ts`), which must
 * keep working when the paywall blocks a user.
 */

/** User id from the verified access token, or the dev escape hatches (see above). */
export function resolveUserId(extra: {
  authInfo?: { extra?: Record<string, unknown> };
}): string | undefined {
  return (
    (extra.authInfo?.extra?.userId as string | undefined) ??
    (process.env.MCP_REQUIRE_AUTH !== "true"
      ? process.env.MCP_DEV_USER_ID
      : undefined)
  );
}

export function registerGatedTool<Args extends ZodRawShapeCompat>(
  server: McpServer,
  name: string,
  description: string,
  schema: Args,
  handler: ToolCallback<Args>,
): void {
  // Cast: ToolCallback<Args> is a conditional type, which TS can't match
  // against a function literal for a generic Args.
  const gated = (async (args, extra) => {
    const userId = resolveUserId(extra);
    if (!userId) return handler(args, extra); // open local dev, no dev id

    const start = Date.now();
    const record = (outcome: "ok" | "error" | "blocked") =>
      recordToolEvent({
        userId,
        tool: name,
        sessionId: extra.sessionId,
        outcome,
        latencyMs: Date.now() - start,
        argsKeys: Object.keys(args ?? {}),
      });

    const decision = await checkAndRecordUsage(userId);
    if (!decision.allowed) {
      await record("blocked");
      return { content: [{ type: "text", text: decision.blockedMessage! }] };
    }
    let result;
    try {
      result = await handler(args, extra);
    } catch (err) {
      await record("error");
      throw err; // the SDK turns this into an isError tool result
    }
    await record("ok");
    if (decision.warning) {
      result.content = [
        ...(result.content ?? []),
        { type: "text", text: decision.warning },
      ];
    }
    return result;
  }) as ToolCallback<Args>;
  server.tool(name, description, schema, gated);
}
