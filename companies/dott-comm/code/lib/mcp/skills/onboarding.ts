import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";

/**
 * `onboarding` — il primo passo dello studio. È lo strumento che il prompt del
 * sito fa chiamare per PRIMO: invece di lasciare il commercialista davanti a un
 * elenco di funzioni, avvia un onboarding guidato che gli chiede qual è la sua
 * priorità sulle prossime scadenze (a partire dal 20 luglio) e poi lo instrada
 * verso lo strumento giusto per il suo caso.
 *
 * Il tool è STATELESS (ADR 0003 — niente stato di dominio lato server): non
 * conduce lui la conversazione, ma restituisce un "playbook" strutturato — il
 * saluto, l'intervista da fare UNA domanda alla volta e la mappa di
 * instradamento (priorità → tool + primo passo concreto). È il client (Claude)
 * a condurre l'intervista e ad attivare i tool giusti in base alle risposte.
 *
 * Passa `priorita` quando il commercialista l'ha già dichiarata, così il
 * playbook mette in cima la rotta consigliata; lascialo vuoto alla primissima
 * chiamata per ottenere l'intervista completa.
 */

type Rotta = {
  chiave: Priorita;
  titolo: string;
  quando: string; // come la riconosci dalle parole del commercialista
  tool: string;
  primoPasso: string;
};

type Priorita = (typeof PRIORITA)[number];

const PRIORITA = [
  "raccolta_documenti",
  "estrazione_dati",
  "calcolo_versamenti",
  "comunicazione_clienti",
  "chi_non_puo_pagare",
  "altro",
] as const;

const ROTTE: Rotta[] = [
  {
    chiave: "raccolta_documenti",
    titolo: "Non ho ancora raccolto i documenti dai clienti",
    quando: "mancano fatture, estratti conto, incassi; sei fermo perché i clienti non hanno mandato le carte",
    tool: "raccolta_documenti",
    primoPasso:
      "Parti dal cliente più urgente: chiedimi il suo tipo (forfettario, professionista, impresa) e cosa ti risulta già arrivato, poi chiama `raccolta_documenti` per generare la bozza di sollecito con la lista precisa di cosa manca.",
  },
  {
    chiave: "estrazione_dati",
    titolo: "Ho i documenti ma vanno normalizzati e verificati",
    quando: "hai ricevute/scontrini/fatture (anche estere) o un export gestionale da mettere in ordine e controllare",
    tool: "estrai_documenti",
    primoPasso:
      "Chiedimi i documenti di un cliente, estraine le righe (usa anche il prompt `metodo_estrazione_documenti`) e passale a `estrai_documenti` per la validazione deterministica (date/importi, P.IVA, codice fiscale).",
  },
  {
    chiave: "calcolo_versamenti",
    titolo: "Devo calcolare saldo e acconti per il 20 luglio",
    quando: "hai i numeri e ti serve il prospetto del versamento del 20/7 (saldo + 1° acconto), l'alternativa al 20/8, storico vs previsionale, il piano rate",
    tool: "prospetto_acconti",
    primoPasso:
      "Chiedimi cliente, regime e gli importi dal dichiarativo (saldo e base acconto), poi chiama `prospetto_acconti` per la bozza del prospetto con i codici F24.",
  },
  {
    chiave: "comunicazione_clienti",
    titolo: "Devo comunicare gli importi ai clienti",
    quando: "gli importi sono pronti e devi avvisare i clienti quanto e quando pagare",
    tool: "comunica_versamenti",
    primoPasso:
      "Chiedimi l'elenco dei clienti con importo e scadenza, poi chiama `comunica_versamenti` per le bozze di comunicazione (rispetta il prompt `tono_comunicazione_studio`).",
  },
  {
    chiave: "chi_non_puo_pagare",
    titolo: "Ho clienti che non riescono a pagare in tempo",
    quando: "un cliente non ce la fa entro la scadenza e valuti ravvedimento o rateizzazione",
    tool: "ravvedimento",
    primoPasso:
      "Chiedimi importo dovuto, scadenza originaria e data prevista di pagamento, poi chiama `ravvedimento` per la bozza con sanzione ridotta, interessi e codici F24.",
  },
];

function rottaBlock(r: Rotta, n: number): string {
  return [
    `${n}. ${r.titolo}`,
    `   Riconoscila se: ${r.quando}.`,
    `   → Strumento: \`${r.tool}\`. ${r.primoPasso}`,
  ].join("\n");
}

export function registerOnboarding(server: McpServer) {
  registerGatedTool(
    server,
    "onboarding",
    "Avvia l'onboarding dello studio: è il PRIMO strumento da chiamare in una nuova chat. " +
      "Restituisce un playbook che guida a chiedere al commercialista la sua priorità sulle " +
      "prossime scadenze (a partire dal 20 luglio) e a instradarlo verso lo strumento giusto " +
      "(raccolta_documenti, estrai_documenti, prospetto_acconti, comunica_versamenti, " +
      "ravvedimento). Chiamalo senza argomenti per ottenere l'intervista completa; passa " +
      "`priorita` se il commercialista l'ha già dichiarata, per avere in cima la rotta consigliata.",
    {
      priorita: z
        .enum(PRIORITA)
        .optional()
        .describe(
          "Priorità già dichiarata dal commercialista, se nota; determina la rotta messa in cima. Lascia vuoto alla prima chiamata.",
        ),
      contesto: z
        .string()
        .optional()
        .describe(
          "Contesto libero eventualmente già raccolto (quanti/quali clienti, tipo di studio, urgenze).",
        ),
    },
    async ({ priorita, contesto }) => {
      const L: string[] = [];

      L.push("ONBOARDING STUDIO — DOTT. COMM.");
      L.push(
        "Sei l'assistente digitale di uno studio di Dottore Commercialista. Conduci TU " +
          "l'onboarding qui sotto: non limitarti a incollarlo, usalo come copione.",
      );
      L.push("");

      // Rotta consigliata in cima, se la priorità è già nota.
      const rottaScelta =
        priorita && priorita !== "altro"
          ? ROTTE.find((r) => r.chiave === priorita)
          : undefined;
      if (rottaScelta) {
        L.push("ROTTA CONSIGLIATA (priorità già indicata dal commercialista):");
        L.push(`→ Strumento: \`${rottaScelta.tool}\`. ${rottaScelta.primoPasso}`);
        L.push(
          "Conferma con una domanda breve che sia davvero questa la priorità, poi procedi.",
        );
        L.push("");
      }
      if (contesto) {
        L.push(`Contesto già raccolto: ${contesto}`);
        L.push("");
      }

      // 1) Saluto + intervista, una domanda alla volta.
      L.push("1) SALUTO E INTERVISTA (una domanda alla volta, aspetta la risposta)");
      L.push(
        "Saluta in una riga come assistente dello studio, poi chiedi — senza elencare " +
          "tutte le funzioni, con tono semplice e concreto:",
      );
      L.push(
        '  a. "Qual è la cosa che ti pesa di più in vista delle prossime scadenze, ' +
          'a partire dal 20 luglio (saldo + primo acconto)?" — le priorità tipiche sono ' +
          "elencate al punto 2; se la sua non rientra, adattati.",
      );
      L.push(
        "  b. Su quanti e quali clienti stai lavorando (forfettari, professionisti, " +
          "imprese semplificate/ordinarie) e quali sono i più urgenti.",
      );
      L.push('  c. "Qual è la cosa che ti toglierebbe più stress questa settimana?"');
      L.push("");

      // 2) Mappa di instradamento.
      L.push("2) MAPPA DI INSTRADAMENTO (priorità → strumento → primo passo)");
      ROTTE.forEach((r, i) => L.push(rottaBlock(r, i + 1)));
      L.push(
        `${ROTTE.length + 1}. Altro / non è chiaro: fai una domanda in più per capire ` +
          "il vero blocco, poi scegli lo strumento più vicino qui sopra. Se serve solo " +
          "una risposta fiscale, dilla con le cautele del punto 3.",
      );
      L.push("");

      // 3) Regole.
      L.push("3) COME PROCEDERE");
      L.push(
        "- Un passo alla volta: proponi il primo passo concreto, aspetta la conferma, poi esegui.",
      );
      L.push(
        "- Ogni output è una BOZZA che il professionista rivede e approva: la responsabilità resta sua.",
      );
      L.push(
        "- Non inventare mai importi, scadenze o codici tributo: se manca un dato, chiedilo.",
      );
      L.push("");
      L.push("Ora inizia dal punto 1: saluta e fai la prima domanda.");

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
