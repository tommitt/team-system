import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { euro } from "@/lib/fiscal/money";

/**
 * L2 `comunica_versamenti` — dagli importi calcolati (da `prospetto_acconti`) a
 * una bozza di comunicazione personalizzata per il cliente: cosa/quando/opzioni
 * + richiesta di conferma "pagato?". Il tracking sent/confirmed è un log nei file
 * dello studio, aggiornato da Claude Code: il tool è puro, non persiste nulla.
 */
export function registerComunicaVersamenti(server: McpServer) {
  registerGatedTool(
    server,
    "comunica_versamenti",
    "Assembla una bozza di comunicazione al cliente con l'importo da versare, la scadenza, " +
      "l'eventuale alternativa al 20/8 (+0,80%) e il piano rate, e chiude con la richiesta di " +
      "conferma del pagamento. Prende gli importi già calcolati da `prospetto_acconti`. " +
      "Restituisce una BOZZA da rivedere; il tracking inviato/confermato lo tieni nei file dello studio.",
    {
      cliente: z.string().describe("Nome del cliente"),
      totale: z.number().describe("Importo totale da versare alla scadenza, in euro"),
      scadenza: z.string().default("20 luglio 2026").describe("Scadenza principale"),
      dettaglio: z
        .array(z.object({ voce: z.string(), importo: z.number() }))
        .default([])
        .describe("Righe di dettaglio (es. Saldo 2025, 1ª rata acconto)"),
      alternativa_agosto: z
        .object({ importo: z.number(), scadenza: z.string() })
        .optional()
        .describe("Alternativa al 20/8 con maggiorazione, se applicabile"),
      rate: z
        .string()
        .optional()
        .describe("Sintesi del piano rate, se proposto (es. '6 rate da ~180€ fino al 16/12')"),
      canale: z
        .enum(["email", "whatsapp", "pec"])
        .default("email")
        .describe("Canale: influenza tono e lunghezza"),
    },
    async ({ cliente, totale, scadenza, dettaglio, alternativa_agosto, rate, canale }) => {
      const breve = canale === "whatsapp";
      const L: string[] = [];
      L.push(`COMUNICAZIONE VERSAMENTO — ${cliente} (canale: ${canale})`);
      L.push("");
      L.push("--- BOZZA (da rivedere prima dell'invio) ---");

      if (!breve) {
        L.push(`Oggetto: ${cliente} — versamento in scadenza il ${scadenza}`);
        L.push("");
      }
      L.push(`Gentile ${cliente},`);
      L.push(
        `ti riepiloghiamo l'importo da versare entro il ${scadenza}: ${euro(totale)}.`,
      );

      if (dettaglio.length > 0 && !breve) {
        L.push("");
        L.push("Dettaglio:");
        for (const d of dettaglio) L.push(`• ${d.voce}: ${euro(d.importo)}`);
      }

      if (alternativa_agosto) {
        L.push("");
        L.push(
          `In alternativa puoi versare entro il ${alternativa_agosto.scadenza} l'importo di ${euro(alternativa_agosto.importo)} (con la maggiorazione dello 0,80%).`,
        );
      }

      if (rate) {
        L.push("");
        L.push(`È possibile rateizzare: ${rate}.`);
      }

      L.push("");
      L.push(
        breve
          ? "Ci confermi quando hai pagato? Grazie!"
          : "Ti prepariamo noi il modello F24. Appena effettui il pagamento, ti chiediamo di confermarcelo così aggiorniamo la tua posizione.",
      );
      if (!breve) {
        L.push("");
        L.push("Un cordiale saluto,");
        L.push("[Studio]");
      }
      L.push("--- FINE BOZZA ---");
      L.push("");
      L.push(
        "Promemoria: registra nel file dello studio lo stato di questa comunicazione (inviata / confermata).",
      );

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
