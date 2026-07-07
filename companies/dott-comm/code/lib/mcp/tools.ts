import { z } from "zod";
import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { checkAndRecordUsage } from "@/lib/billing/gate";

/**
 * Registers every tool through the billing gate (ADR 0002): each call
 * atomically records usage in Supabase and is blocked in-band (a normal tool
 * result with an upgrade message — never a 401/403) once the free trial is
 * exhausted or the subscription is inactive.
 *
 * The WorkOS user id comes from the verified JWT (`extra.authInfo.extra.userId`,
 * set in `app/api/[transport]/route.ts`). Dev escape hatches when auth is off:
 * set `MCP_DEV_USER_ID` to exercise the gate against a fake user, or leave it
 * unset to run ungated.
 */
function registerGatedTool<Args extends ZodRawShapeCompat>(
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

/**
 * Registers Dott. Comm.'s MCP capabilities on the given server.
 *
 * The product distinguishes several capability categories (see
 * `content/brainstorms/catalogo-skills-tools.md`). Two are seeded here as
 * placeholders so the endpoint is exercisable end-to-end:
 *
 *  - a **skill** (`calcola_ravvedimento`) — a self-contained codified
 *    procedure that works on data the client passes in, no external system.
 *  - a **tool/connector** (`studio_db_cliente`) — a deterministic lookup
 *    against the studio's own data (the `studio-db` keystone, not built yet).
 *
 * Both return stubbed data. Replace the bodies with real logic as capabilities
 * graduate from the brainstorm; keep registration here so the route stays thin.
 */
export function registerTools(server: McpServer) {
  // --- Skill placeholder -------------------------------------------------
  registerGatedTool(
    server,
    "placeholder_skill_ravvedimento",
    "⚠️ PLACEHOLDER — NOT IMPLEMENTED. Scaffolding example of a *skill* capability " +
      "(a self-contained codified procedure). Does no real calculation; only echoes " +
      "its inputs. Do not use for real work. Real target: calcola sanzioni ridotte e " +
      "interessi per un ravvedimento operoso.",
    {
      importo: z.number().positive().describe("Imposta dovuta, in euro"),
      data_scadenza: z
        .string()
        .describe("Scadenza originaria del versamento (YYYY-MM-DD)"),
      data_pagamento: z
        .string()
        .describe("Data prevista del pagamento (YYYY-MM-DD)"),
    },
    async ({ importo, data_scadenza, data_pagamento }) => {
      return {
        content: [
          {
            type: "text",
            text:
              `⚠️ PLACEHOLDER — NOT IMPLEMENTED. No ravvedimento was calculated; ` +
              `this tool is scaffolding only.\n` +
              `Echoed inputs: importo=€${importo}, scadenza=${data_scadenza}, pagamento=${data_pagamento}.`,
          },
        ],
      };
    },
  );

  // --- Connector/tool placeholder ---------------------------------------
  registerGatedTool(
    server,
    "placeholder_tool_studio_db",
    "⚠️ PLACEHOLDER — NOT IMPLEMENTED. Scaffolding example of a *connector tool* " +
      "(a deterministic lookup against an external/proprietary system). No database " +
      "is connected; always returns empty. Do not use for real work. Real target: " +
      "recupera anagrafica e scadenzario di un cliente dallo studio-db.",
    {
      cliente_id: z.string().describe("Identificativo del cliente"),
    },
    async ({ cliente_id }) => {
      return {
        content: [
          {
            type: "text",
            text:
              `⚠️ PLACEHOLDER — NOT IMPLEMENTED. studio-db is not connected; ` +
              `no record returned for cliente_id=${cliente_id}.`,
          },
        ],
      };
    },
  );
}
