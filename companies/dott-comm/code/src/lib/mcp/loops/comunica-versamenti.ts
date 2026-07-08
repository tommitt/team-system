import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { euro } from "@/lib/fiscal/money";

/**
 * L2 `comunica_versamenti` — dagli importi calcolati (da `prospetto_acconti` o
 * dalle liquidazioni del 16) alle bozze di comunicazione personalizzate, in
 * forma CAMPAGNA: il rito di ogni scadenza di versamento sul portafoglio.
 * Restituisce il riepilogo di campagna + una bozza per cliente con importo,
 * scadenza, opzioni e richiesta di conferma "pagato?". Il tracking
 * inviata/confermata vive in `studio/versamenti/<scadenza>.md` (prompt
 * `convenzione_studio_db`), gestito dal client: il tool è puro, non persiste
 * nulla lato server.
 */
export function registerComunicaVersamenti(server: McpServer) {
  registerGatedTool(
    server,
    "comunica_versamenti",
    "Campagna di comunicazione versamenti: per ogni cliente assembla la bozza con importo da " +
      "versare, scadenza, eventuale alternativa maggiorata e piano rate, chiusa dalla richiesta " +
      "di conferma del pagamento; in testa il riepilogo della campagna. Un cliente solo = array " +
      "di uno. Prende gli importi già calcolati (`prospetto_acconti`, liquidazioni). Il tracking " +
      "inviata/confermata vive in `studio/versamenti/<scadenza>.md` (prompt `convenzione_studio_db`). " +
      "Ogni bozza va rivista prima dell'invio.",
    {
      scadenza: z
        .string()
        .default("20 luglio 2026")
        .describe("Scadenza principale della campagna"),
      versamenti: z
        .array(
          z.object({
            cliente: z.string().describe("Nome del cliente"),
            totale: z.number().describe("Importo totale da versare alla scadenza, in euro"),
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
          }),
        )
        .min(1)
        .describe("I versamenti da comunicare (uno o molti clienti)"),
    },
    async ({ scadenza, versamenti }) => {
      const L: string[] = [];
      const totaleCampagna = versamenti.reduce((s, v) => s + v.totale, 0);

      L.push(`CAMPAGNA COMUNICAZIONE VERSAMENTI — scadenza ${scadenza}`);
      L.push(
        `${versamenti.length} clienti · totale da comunicare: ${euro(totaleCampagna)}`,
      );
      L.push("");
      L.push("| Cliente | Importo | Canale | Rate |");
      L.push("|---|---|---|---|");
      for (const v of versamenti) {
        L.push(
          `| ${v.cliente} | ${euro(v.totale)} | ${v.canale} | ${v.rate ?? "—"} |`,
        );
      }
      L.push("");

      for (const v of versamenti) {
        const breve = v.canale === "whatsapp";
        L.push(`--- BOZZA — ${v.cliente} (canale: ${v.canale}, da rivedere prima dell'invio) ---`);
        if (!breve) {
          L.push(`Oggetto: ${v.cliente} — versamento in scadenza il ${scadenza}`);
          L.push("");
        }
        L.push(`Gentile ${v.cliente},`);
        L.push(
          `ti riepiloghiamo l'importo da versare entro il ${scadenza}: ${euro(v.totale)}.`,
        );

        if (v.dettaglio.length > 0 && !breve) {
          L.push("");
          L.push("Dettaglio:");
          for (const d of v.dettaglio) L.push(`• ${d.voce}: ${euro(d.importo)}`);
        }

        if (v.alternativa_agosto) {
          L.push("");
          L.push(
            `In alternativa puoi versare entro il ${v.alternativa_agosto.scadenza} l'importo di ${euro(v.alternativa_agosto.importo)} (con la maggiorazione dello 0,80%).`,
          );
        }

        if (v.rate) {
          L.push("");
          L.push(`È possibile rateizzare: ${v.rate}.`);
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
      }

      L.push(
        `Aggiorna \`studio/versamenti/${scadenza.toLowerCase().replace(/\s+/g, "-")}.md\` ` +
          "(colonne Cliente | Importo | Canale | Inviata il | Confermata) man mano che invii e " +
          "ricevi conferme; a ridosso della scadenza rilancia chi non ha confermato.",
      );

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
