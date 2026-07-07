import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
  server.tool(
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
  server.tool(
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
