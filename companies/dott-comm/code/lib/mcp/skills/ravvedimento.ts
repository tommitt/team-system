import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { calcolaRavvedimento } from "@/lib/fiscal/ravvedimento";
import { euro } from "@/lib/fiscal/money";
import { DISCLAIMER_BOZZA } from "@/lib/fiscal/constants";

/**
 * S9 `ravvedimento` — calcolo di sanzione ridotta + interessi per un versamento
 * tardivo (supporta lo step "can't-pay" del crunch). Sostituisce il placeholder.
 * Aritmetica in `lib/fiscal/ravvedimento.ts`; le percentuali sono DA VERIFICARE.
 */
export function registerRavvedimento(server: McpServer) {
  registerGatedTool(
    server,
    "ravvedimento",
    "Calcola sanzione ridotta e interessi legali per il ravvedimento operoso di un versamento " +
      "tardivo, in base ai giorni di ritardo. Restituisce una BOZZA con gli scaglioni applicati " +
      "e i codici F24 tipici (da verificare). Utile quando il cliente non riesce a pagare entro " +
      "la scadenza. La decisione resta del professionista.",
    {
      importo: z.number().positive().describe("Imposta dovuta non versata, in euro"),
      data_scadenza: z
        .string()
        .describe("Scadenza originaria del versamento (YYYY-MM-DD)"),
      data_pagamento: z
        .string()
        .describe("Data prevista del pagamento col ravvedimento (YYYY-MM-DD)"),
      tasso_legale_annuo: z
        .number()
        .optional()
        .describe(
          "Tasso legale annuo del periodo (es. 0.02). Se omesso usa il default in constants.ts (DA VERIFICARE).",
        ),
    },
    async ({ importo, data_scadenza, data_pagamento, tasso_legale_annuo }) => {
      const r = calcolaRavvedimento({
        importo,
        dataScadenza: data_scadenza,
        dataPagamento: data_pagamento,
        tassoLegaleAnnuo: tasso_legale_annuo,
      });

      const L: string[] = [];
      L.push(`RAVVEDIMENTO OPEROSO — ${data_scadenza} → ${data_pagamento}`);
      L.push(`Giorni di ritardo: ${r.giorniRitardo} (${r.scaglione})`);
      L.push("");
      L.push(`Imposta:    ${euro(r.importo)}`);
      L.push(`Sanzione:   ${euro(r.sanzione)}`);
      L.push(
        `Interessi:  ${euro(r.interessi)} (tasso legale ${(r.tassoLegaleAnnuo * 100).toFixed(2)}% annuo)`,
      );
      L.push(`TOTALE:     ${euro(r.totale)}`);
      L.push("");
      L.push(
        "F24 (DA VERIFICARE): imposta col codice tributo originario; sanzione col codice sanzione " +
          "(es. 8901 per IRPEF); interessi col codice interessi da ravvedimento (es. 1989 per IRPEF), " +
          "stesso anno di riferimento.",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
