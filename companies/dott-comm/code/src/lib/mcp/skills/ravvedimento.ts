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
      "tardivo (violazioni dal 1/9/2024, base 25%): scaglioni temporali fino a 1 anno, poi " +
      "lett. b-bis; con schema di atto ricevuto si applica la lett. b-ter (1/6). Interessi " +
      "pro-rata per anno col tasso legale vigente. Restituisce una BOZZA con fonti e caveat. " +
      "La decisione resta del professionista.",
    {
      importo: z.number().positive().describe("Imposta dovuta non versata, in euro"),
      data_scadenza: z
        .string()
        .describe("Scadenza originaria del versamento (YYYY-MM-DD)"),
      data_pagamento: z
        .string()
        .describe("Data prevista del pagamento col ravvedimento (YYYY-MM-DD)"),
      schema_di_atto: z
        .boolean()
        .default(false)
        .describe(
          "true se è stata comunicata lo schema di atto ex art. 6-bis L. 212/2000 (contraddittorio preventivo): si applica la riduzione a 1/6 (lett. b-ter)",
        ),
      tasso_legale_annuo: z
        .number()
        .optional()
        .describe(
          "Override: un unico tasso legale su tutto il periodo (es. 0.016). Se omesso usa la tabella anno per anno del registro costanti (pro-rata).",
        ),
    },
    async ({
      importo,
      data_scadenza,
      data_pagamento,
      schema_di_atto,
      tasso_legale_annuo,
    }) => {
      const r = calcolaRavvedimento({
        importo,
        dataScadenza: data_scadenza,
        dataPagamento: data_pagamento,
        tassoLegaleAnnuo: tasso_legale_annuo,
        schemaDiAttoRicevuto: schema_di_atto,
      });

      const L: string[] = [];
      L.push(`RAVVEDIMENTO OPEROSO — ${data_scadenza} → ${data_pagamento}`);
      L.push(`Giorni di ritardo: ${r.giorniRitardo} (${r.scaglione})`);
      L.push("");
      L.push(`Imposta:    ${euro(r.importo)}`);
      L.push(`Sanzione:   ${euro(r.sanzione)}`);
      L.push(`Interessi:  ${euro(r.interessi)}`);
      for (const s of r.interessiPerAnno) {
        L.push(
          `            · ${s.anno}: ${s.giorni} gg al ${(s.tasso * 100).toFixed(2)}% = ${euro(s.interessi)}${s.verificato ? "" : " ⚠️ tasso NON verificato"}`,
        );
      }
      L.push(`TOTALE:     ${euro(r.totale)}`);
      L.push("");
      for (const a of r.avvertenze) L.push(`⚠️ ${a}`);
      if (r.avvertenze.length > 0) L.push("");
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
