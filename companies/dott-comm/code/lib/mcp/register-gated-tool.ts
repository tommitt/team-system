import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { checkAndRecordUsage } from "@/lib/billing/gate";

/**
 * Registers a tool through the billing gate (ADR 0002): each call atomically
 * records usage in Supabase and is blocked in-band (a normal tool result with an
 * upgrade message — never a 401/403) once the free trial is exhausted or the
 * subscription is inactive.
 *
 * The WorkOS user id comes from the verified JWT (`extra.authInfo.extra.userId`,
 * set in `app/api/[transport]/route.ts`). Dev escape hatches when auth is off:
 * set `MCP_DEV_USER_ID` to exercise the gate against a fake user, or leave it
 * unset to run ungated (so the pure fiscal tools work without Supabase).
 *
 * Every capability registers through this — see the per-capability modules under
 * `lib/mcp/skills` and `lib/mcp/loops`, composed by `registerTools`.
 */
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
    const userId =
      (extra.authInfo?.extra?.userId as string | undefined) ??
      (process.env.MCP_REQUIRE_AUTH !== "true"
        ? process.env.MCP_DEV_USER_ID
        : undefined);
    if (!userId) return handler(args, extra); // open local dev, no dev id

    const decision = await checkAndRecordUsage(userId);
    if (!decision.allowed) {
      return { content: [{ type: "text", text: decision.blockedMessage! }] };
    }
    const result = await handler(args, extra);
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
