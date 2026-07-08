import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { calcolaTermini, type TipoAtto } from "@/lib/fiscal/termini";
import { euro } from "@/lib/fiscal/money";
import {
  DISCLAIMER_BOZZA,
  RIDUZIONE_SANZIONE_BONARIO,
  RIDUZIONE_SANZIONE_CONTROLLO_FORMALE,
} from "@/lib/fiscal/constants";

/**
 * `triage_atto` — il triage quotidiano degli atti notificati (W1 in forma
 * paste-in, area 06). Il client (Claude Code) legge l'atto incollato/PDF e lo
 * classifica nel tipo; questo tool fa la parte deterministica a peso legale:
 * calcola i termini perentori (sospensione feriale, sospensione estiva bonari,
 * +90 gg adesione, slittamenti festivi) e le opzioni disponibili. Il costo di
 * un termine perso è illimitato: ogni data va comunque verificata dal
 * professionista sull'atto.
 */
export function registerTriageAtto(server: McpServer) {
  registerGatedTool(
    server,
    "triage_atto",
    "Calcola i termini perentori di un atto notificato (avviso bonario, controllo formale, " +
      "avviso di accertamento, cartella, intimazione, preavviso di fermo) a partire dalla data " +
      "di notifica: scadenze con sospensione feriale/estiva e slittamento festivo, opzioni " +
      "disponibili (adesione, acquiescenza, rateazione, CIVIS) ed eventuale sanzione ridotta. " +
      "Classifica prima tu l'atto dal testo/PDF; la data di notifica è quella di RICEZIONE " +
      "(PEC: ricevuta di consegna; raccomandata: firma/giacenza). Restituisce una BOZZA: " +
      "ogni data va verificata sull'atto.",
    {
      tipo_atto: z
        .enum([
          "avviso_bonario",
          "controllo_formale",
          "avviso_accertamento",
          "cartella_pagamento",
          "intimazione_pagamento",
          "preavviso_fermo",
        ])
        .describe("Tipo di atto, classificato dal testo"),
      data_notifica: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD")
        .describe("Data di notifica/ricezione dell'atto (YYYY-MM-DD)"),
      cliente: z.string().optional().describe("Nome del cliente, per l'intestazione"),
      ente: z
        .string()
        .optional()
        .describe("Ente emittente come riportato sull'atto (AdE, AdE-Riscossione, INPS, ...)"),
      importo: z
        .number()
        .optional()
        .describe("Importo complessivo richiesto dall'atto, in euro (se leggibile)"),
      sanzione_piena: z
        .number()
        .optional()
        .describe(
          "Solo avviso bonario: sanzione piena indicata nell'atto, per calcolare la ridotta (1/3, o 2/3 se da controllo formale)",
        ),
      telematico_intermediario: z
        .boolean()
        .default(false)
        .describe(
          "Solo avviso bonario: esito reso disponibile in via telematica all'intermediario (termine 90 gg invece di 60)",
        ),
      da_controllo_formale: z
        .boolean()
        .default(false)
        .describe(
          "Solo avviso bonario: esito di CONTROLLO FORMALE 36-ter (sanzione ridotta a 2/3, non a 1/3 come nel controllo automatico 36-bis)",
        ),
      con_adesione: z
        .boolean()
        .default(false)
        .describe(
          "Solo accertamento: mostra anche il termine di ricorso sospeso +90 gg da istanza di adesione",
        ),
    },
    async (args) => {
      const triage = calcolaTermini({
        tipo: args.tipo_atto as TipoAtto,
        dataNotifica: args.data_notifica,
        telematicoIntermediario: args.telematico_intermediario,
        conAdesione: args.con_adesione,
        esitoControlloFormale: args.da_controllo_formale,
      });

      const L: string[] = [];
      L.push(
        `TRIAGE ATTO — ${args.cliente ?? "cliente"} · ${args.tipo_atto.replace(/_/g, " ")}${args.ente ? ` · ${args.ente}` : ""}`,
      );
      L.push(`Notificato il: ${args.data_notifica}`);
      if (args.importo !== undefined) L.push(`Importo richiesto: ${euro(args.importo)}`);
      L.push("");

      L.push("TERMINI (verificare ogni data sull'atto):");
      for (const t of triage.termini) {
        const flag = t.perentorio ? "⏰ PERENTORIO" : "termine ordinatorio";
        L.push(`- ${t.scadenza} — ${t.descrizione} [${flag}]`);
        if (t.sospensioni.length > 0)
          L.push(`    conteggio con ${t.sospensioni.join(" + ")}`);
        if (t.nota) L.push(`    ${t.nota}`);
      }
      L.push("");

      if (args.tipo_atto === "avviso_bonario" && args.sanzione_piena !== undefined) {
        const riduzione = args.da_controllo_formale
          ? { frazione: "2/3", valore: RIDUZIONE_SANZIONE_CONTROLLO_FORMALE.valore }
          : { frazione: "1/3", valore: RIDUZIONE_SANZIONE_BONARIO.valore };
        const ridotta = args.sanzione_piena * riduzione.valore;
        L.push(
          `Sanzione: piena ${euro(args.sanzione_piena)} → ridotta a ${riduzione.frazione} se si definisce nei termini: ${euro(ridotta)} (risparmio ${euro(args.sanzione_piena - ridotta)}).`,
        );
        L.push("");
      }

      L.push("OPZIONI (la scelta resta del professionista):");
      for (const o of triage.opzioni) L.push(`- ${o}`);
      L.push("");

      L.push("PROSSIMI PASSI SUGGERITI:");
      L.push(
        "- Registra l'atto nello scadenzario dello studio (`studio/scadenzario.md`) con il termine più vicino e l'assegnatario.",
      );
      L.push(
        "- Se serve, prepara la bozza di comunicazione al cliente (cosa è arrivato, cosa rischia, cosa proponiamo).",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
