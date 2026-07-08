import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";

/**
 * L1 `raccolta_documenti` — il sollecito eterno (area 09, il fossato), in forma
 * CAMPAGNA: prende il portafoglio (o un sottoinsieme) e per ogni cliente
 * confronta la checklist del suo tipo con quanto è arrivato, restituendo la
 * dashboard di campagna + una bozza di sollecito SPECIFICO per ciascun cliente
 * incompleto. Lo stato (cosa è arrivato, chi è stato sollecitato) resta nei
 * file dello studio — `studio/raccolta/<campagna>.md`, vedi prompt
 * `convenzione_studio_db` — gestiti dal client: il tool è puro, non persiste
 * nulla lato server. Il client può derivare `documenti_presenti` scandendo la
 * cartella documenti dello studio invece di chiederlo all'utente.
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
    "Campagna di raccolta documenti sul portafoglio: per ogni cliente confronta la checklist " +
      "del suo tipo con quanto è già arrivato e restituisce la dashboard (chi manca di cosa) + " +
      "una bozza di sollecito specifico per ogni cliente incompleto. Un cliente solo = array di " +
      "uno. Lo stato della campagna vive in `studio/raccolta/<campagna>.md` (prompt " +
      "`convenzione_studio_db`); deriva `documenti_presenti` scandendo la cartella documenti " +
      "dello studio quando possibile. Tipi cliente: forfettario, professionista, " +
      "impresa_semplificata, impresa_ordinaria, persona_fisica.",
    {
      campagna: z
        .string()
        .default("raccolta documenti")
        .describe("Nome della campagna (es. 'dichiarativi 2026'): dà il nome al file di stato"),
      scadenza: z
        .string()
        .default("20 luglio 2026")
        .describe("Scadenza da citare nei solleciti"),
      clienti: z
        .array(
          z.object({
            nome: z.string().describe("Nome del cliente"),
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
              .describe(
                "Voci mancanti aggiuntive fuori checklist (es. 'fattura ACME di dicembre')",
              ),
          }),
        )
        .min(1)
        .describe("I clienti della campagna (uno o molti)"),
    },
    async ({ campagna, scadenza, clienti }) => {
      type Esito = {
        nome: string;
        tipo: string;
        arrivati: number;
        totale: number;
        mancanti: string[];
      };

      const esiti: Esito[] = clienti.map((c) => {
        const checklist = CHECKLIST[c.tipo_cliente];
        const presenti = new Set(
          c.documenti_presenti.map((d) => d.trim().toLowerCase()),
        );
        const isPresente = (v: VoceChecklist) =>
          presenti.has(v.chiave.toLowerCase()) ||
          presenti.has(v.label.toLowerCase());
        const mancanti = [
          ...checklist.filter((v) => !isPresente(v)).map((v) => v.label),
          ...c.note_extra,
        ];
        return {
          nome: c.nome,
          tipo: c.tipo_cliente,
          arrivati: checklist.filter(isPresente).length,
          totale: checklist.length,
          mancanti,
        };
      });

      const incompleti = esiti.filter((e) => e.mancanti.length > 0);
      const completi = esiti.length - incompleti.length;

      const L: string[] = [];
      L.push(`CAMPAGNA RACCOLTA DOCUMENTI — ${campagna} (scadenza ${scadenza})`);
      L.push(
        `${esiti.length} clienti: ${completi} completi ✅ · ${incompleti.length} da sollecitare`,
      );
      L.push("");

      L.push("| Cliente | Tipo | Checklist | Mancanti |");
      L.push("|---|---|---|---|");
      for (const e of esiti) {
        const stato =
          e.mancanti.length === 0 ? "✅ completo" : e.mancanti.join("; ");
        L.push(`| ${e.nome} | ${e.tipo} | ${e.arrivati}/${e.totale} | ${stato} |`);
      }
      L.push("");

      for (const e of incompleti) {
        L.push(`--- BOZZA SOLLECITO — ${e.nome} (da rivedere prima dell'invio) ---`);
        L.push(`Oggetto: ${e.nome} — documenti mancanti per la scadenza del ${scadenza}`);
        L.push("");
        L.push(`Gentile ${e.nome},`);
        L.push(
          `per completare i calcoli in vista della scadenza del ${scadenza} ci mancano ancora alcuni documenti:`,
        );
        L.push("");
        for (const m of e.mancanti) L.push(`• ${m}`);
        L.push("");
        L.push(
          "Ti chiediamo di inviarceli il prima possibile per evitare ritardi. Restiamo a disposizione per qualsiasi chiarimento.",
        );
        L.push("");
        L.push("Un cordiale saluto,");
        L.push("[Studio]");
        L.push("--- FINE BOZZA ---");
        L.push("");
      }

      L.push(
        `Aggiorna \`studio/raccolta/${campagna.toLowerCase().replace(/\s+/g, "-")}.md\` ` +
          "(colonne Cliente | Mancanti | Sollecitato il | Stato) con l'esito: data del sollecito " +
          "per gli inviati, `completo` per chi ha consegnato tutto.",
      );

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
