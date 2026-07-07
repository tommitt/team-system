import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";

/**
 * L1 `raccolta_documenti` — il sollecito eterno (area 09, il fossato). Tiene una
 * checklist per tipo-cliente, la confronta con quanto è arrivato e produce una
 * bozza di sollecito SPECIFICO ("mancano: estratto conto Q4, ...") + la lista di
 * cosa manca. Lo stato (cosa è arrivato) resta nei file dello studio, gestiti da
 * Claude Code: il tool è puro, non persiste nulla lato server.
 */

type VoceChecklist = { chiave: string; label: string };

const CHECKLIST: Record<string, VoceChecklist[]> = {
  forfettario: [
    { chiave: "fatture_emesse", label: "Fatture/corrispettivi emessi dell'anno" },
    { chiave: "incassi", label: "Incassi effettivi (per cassa)" },
    { chiave: "contributi_inps", label: "F24 contributi INPS versati" },
    { chiave: "spese_deducibili", label: "Contributi previdenziali e altre spese deducibili" },
  ],
  professionista: [
    { chiave: "fatture_emesse", label: "Fatture emesse dell'anno" },
    { chiave: "fatture_ricevute", label: "Fatture ricevute / spese di studio" },
    { chiave: "estratti_conto", label: "Estratti conto bancari (tutti i trimestri)" },
    { chiave: "incassi_pagamenti", label: "Registro incassi e pagamenti (per cassa)" },
    { chiave: "spese_detraibili", label: "Spese detraibili personali (sanitarie, mutuo, ...)" },
    { chiave: "quadro_rw", label: "Investimenti/attività estere per il quadro RW" },
  ],
  impresa_semplificata: [
    { chiave: "fatture_emesse", label: "Fatture emesse dell'anno" },
    { chiave: "fatture_ricevute", label: "Fatture ricevute dell'anno" },
    { chiave: "estratti_conto", label: "Estratti conto bancari (tutti i trimestri)" },
    { chiave: "corrispettivi", label: "Corrispettivi (se attività al dettaglio)" },
    { chiave: "rimanenze", label: "Rimanenze finali di magazzino" },
    { chiave: "cespiti", label: "Acquisti/cessioni di cespiti dell'anno" },
  ],
  impresa_ordinaria: [
    { chiave: "fatture_emesse", label: "Fatture emesse dell'anno" },
    { chiave: "fatture_ricevute", label: "Fatture ricevute dell'anno" },
    { chiave: "estratti_conto", label: "Estratti conto bancari (tutti i trimestri)" },
    { chiave: "rimanenze", label: "Rimanenze finali di magazzino" },
    { chiave: "cespiti", label: "Registro cespiti e ammortamenti" },
    { chiave: "finanziamenti", label: "Contratti di finanziamento/leasing e piani di ammortamento" },
  ],
  persona_fisica: [
    { chiave: "cu", label: "Certificazione Unica (CU)" },
    { chiave: "spese_detraibili", label: "Spese detraibili (sanitarie, istruzione, mutuo, ...)" },
    { chiave: "estratti_conto", label: "Estratti conto (se redditi diversi/di capitale)" },
    { chiave: "quadro_rw", label: "Investimenti/attività estere per il quadro RW" },
  ],
};

export function registerRaccoltaDocumenti(server: McpServer) {
  registerGatedTool(
    server,
    "raccolta_documenti",
    "Confronta la checklist documenti del tipo-cliente con quanto è già arrivato e restituisce " +
      "cosa manca + una bozza di sollecito specifico da inviare al cliente. Pensato per la " +
      "campagna di raccolta pre-20/7. Lo stato di cosa è arrivato lo tieni nei file dello studio: " +
      "passa qui l'elenco `documenti_presenti`. Tipi cliente: forfettario, professionista, " +
      "impresa_semplificata, impresa_ordinaria, persona_fisica.",
    {
      cliente: z.string().describe("Nome del cliente"),
      tipo_cliente: z
        .enum([
          "forfettario",
          "professionista",
          "impresa_semplificata",
          "impresa_ordinaria",
          "persona_fisica",
        ])
        .describe("Tipo cliente: seleziona la checklist"),
      documenti_presenti: z
        .array(z.string())
        .default([])
        .describe(
          "Chiavi o etichette dei documenti già arrivati (es. 'estratti_conto'). Il resto è considerato mancante.",
        ),
      note_extra: z
        .array(z.string())
        .default([])
        .describe("Voci mancanti aggiuntive fuori checklist (es. 'fattura ACME di dicembre')"),
      scadenza: z
        .string()
        .default("20 luglio 2026")
        .describe("Scadenza da citare nel sollecito"),
    },
    async ({ cliente, tipo_cliente, documenti_presenti, note_extra, scadenza }) => {
      const checklist = CHECKLIST[tipo_cliente];
      const presenti = new Set(
        documenti_presenti.map((d) => d.trim().toLowerCase()),
      );
      const isPresente = (v: VoceChecklist) =>
        presenti.has(v.chiave.toLowerCase()) ||
        presenti.has(v.label.toLowerCase());

      const mancanti = checklist.filter((v) => !isPresente(v));
      const arrivati = checklist.filter(isPresente);
      const mancantiLabels = [...mancanti.map((v) => v.label), ...note_extra];

      const L: string[] = [];
      L.push(`RACCOLTA DOCUMENTI — ${cliente} (${tipo_cliente})`);
      L.push(
        `Arrivati: ${arrivati.length}/${checklist.length}. Mancanti: ${mancantiLabels.length}.`,
      );
      L.push("");

      if (mancantiLabels.length === 0) {
        L.push("✅ Checklist completa: nessun sollecito necessario.");
        return { content: [{ type: "text", text: L.join("\n") }] };
      }

      L.push("Mancano:");
      for (const m of mancantiLabels) L.push(`- ${m}`);
      L.push("");
      L.push("--- BOZZA SOLLECITO (da rivedere prima dell'invio) ---");
      L.push(`Oggetto: ${cliente} — documenti mancanti per la scadenza del ${scadenza}`);
      L.push("");
      L.push(`Gentile ${cliente},`);
      L.push(
        `per completare i calcoli in vista della scadenza del ${scadenza} ci mancano ancora alcuni documenti:`,
      );
      L.push("");
      for (const m of mancantiLabels) L.push(`• ${m}`);
      L.push("");
      L.push(
        "Ti chiediamo di inviarceli il prima possibile per evitare ritardi. Restiamo a disposizione per qualsiasi chiarimento.",
      );
      L.push("");
      L.push("Un cordiale saluto,");
      L.push("[Studio]");
      L.push("--- FINE BOZZA ---");

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
