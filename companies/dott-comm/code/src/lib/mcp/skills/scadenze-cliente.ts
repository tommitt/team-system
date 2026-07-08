import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import {
  derivaScadenzario,
  type AttributiCliente,
} from "@/lib/fiscal/adempimenti";
import { aggiungiGiorni } from "@/lib/fiscal/calendario";
import { DISCLAIMER_BOZZA } from "@/lib/fiscal/constants";

/**
 * `scadenze_cliente` — il keystone T1 in forma client-local: dagli attributi
 * del cliente deriva gli adempimenti applicabili e le scadenze nel periodo,
 * pronti da scrivere nello scadenzario dello studio (`studio/scadenzario.md`,
 * vedi prompt `convenzione_studio_db`). Risponde alla domanda di apertura di
 * ogni giornata di studio: "cosa scade e a che punto siamo?". Le date sono
 * quelle del regime tipico: proroghe e casi particolari vanno verificati.
 */
export function registerScadenzeCliente(server: McpServer) {
  registerGatedTool(
    server,
    "scadenze_cliente",
    "Deriva lo scadenzario di un cliente dai suoi attributi (regime, forma, IVA, sostituto " +
      "d'imposta, INPS, immobili, ...): adempimenti applicabili e scadenze nel periodo " +
      "richiesto (default: prossimi 90 giorni), con slittamento festivo applicato. Output " +
      "pronto per `studio/scadenzario.md` (convenzione `convenzione_studio_db`). Le date sono " +
      "quelle del regime TIPICO: è una BOZZA, proroghe e casi particolari vanno verificati.",
    {
      cliente: z.string().describe("Nome del cliente"),
      regime: z
        .enum(["forfettario", "semplificata", "ordinaria"])
        .describe("Regime contabile/fiscale"),
      forma: z
        .enum([
          "persona_fisica",
          "ditta_individuale",
          "professionista",
          "societa_persone",
          "societa_capitali",
        ])
        .describe("Forma giuridica"),
      iva_periodicita: z
        .enum(["mensile", "trimestrale", "nessuna"])
        .optional()
        .describe(
          "Periodicità IVA; default derivato dal regime (ordinaria→mensile, semplificata→trimestrale, forfettario→nessuna)",
        ),
      sostituto_imposta: z
        .boolean()
        .default(false)
        .describe("Opera ritenute su compensi (CU, 770, versamenti mensili)"),
      inps_artigiani_commercianti: z
        .boolean()
        .default(false)
        .describe("Iscritto INPS artigiani/commercianti (rate fisse trimestrali)"),
      immobili: z.boolean().default(false).describe("Possiede immobili soggetti a IMU"),
      sanitario: z
        .boolean()
        .default(false)
        .describe("Operatore sanitario (invio Sistema Tessera Sanitaria)"),
      intrastat: z
        .boolean()
        .default(false)
        .describe("Sopra soglia Intrastat (elenchi mensili)"),
      da: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD")
        .optional()
        .describe("Inizio periodo (YYYY-MM-DD); default: oggi"),
      giorni: z
        .number()
        .int()
        .min(1)
        .max(730)
        .default(90)
        .describe("Ampiezza del periodo in giorni (default 90)"),
    },
    async (args) => {
      const attributi: AttributiCliente = {
        regime: args.regime,
        forma: args.forma,
        ivaPeriodicita: args.iva_periodicita,
        sostitutoImposta: args.sostituto_imposta,
        inpsArtigianiCommercianti: args.inps_artigiani_commercianti,
        immobili: args.immobili,
        sanitario: args.sanitario,
        intrastat: args.intrastat,
      };
      const da = args.da ?? new Date().toISOString().slice(0, 10);
      const a = aggiungiGiorni(da, args.giorni);
      const occorrenze = derivaScadenzario({ attributi, da, a });

      const L: string[] = [];
      L.push(`SCADENZARIO — ${args.cliente} (${args.regime}, ${args.forma.replace(/_/g, " ")})`);
      L.push(`Periodo: ${da} → ${a} · ${occorrenze.length} scadenze derivate`);
      L.push("");
      L.push(
        "Date del regime TIPICO (DA VERIFICARE: proroghe annuali e casi particolari); festivi già slittati.",
      );
      L.push("");

      if (occorrenze.length === 0) {
        L.push("Nessuna scadenza derivata nel periodo (verificare gli attributi).");
      } else {
        L.push("| Scadenza | Adempimento | Note | Stato |");
        L.push("|---|---|---|---|");
        for (const o of occorrenze) {
          L.push(`| ${o.scadenza} | ${o.adempimento} | ${o.nota ?? ""} | da fare |`);
        }
      }

      L.push("");
      L.push(
        "Aggiorna `studio/scadenzario.md` con queste righe (una riga per cliente × adempimento × " +
          "scadenza, colonne Cliente | Scadenza | Adempimento | Assegnatario | Stato — vedi prompt " +
          "`convenzione_studio_db`).",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
