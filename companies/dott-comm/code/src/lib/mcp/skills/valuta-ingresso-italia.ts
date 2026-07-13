import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { DISCLAIMER_BOZZA } from "@/lib/fiscal/constants";
import {
  VEICOLI,
  bozzaPropostaIncarico,
  faqPersonalizzate,
  pianoDiPartenza,
  raccomandaVeicolo,
  type Attivita,
  type IngressoInput,
  type PresenzaFisica,
  type ResidenzaFounder,
  type Orizzonte,
} from "@/lib/fiscal/ingresso-italia";

/**
 * `valuta_ingresso_italia` — l'advisor a monte: una società USA arriva con una
 * situazione e un obiettivo, e il tool valuta il caso reale, raccomanda il
 * veicolo giusto tra i quattro (posizione IVA, ufficio di rappresentanza, branch,
 * S.r.l.), risponde alle domande chiave, propone un piano di partenza e chiude
 * con la bozza di proposta di incarico dello studio. Quando la risposta è la
 * S.r.l., instrada verso `costituzione_controllata_usa` (la roadmap completa).
 *
 * Stateless e puro (ADR 0003): riceve la situazione, non persiste nulla; lo stato
 * dell'orientamento vive in `studio/ingresso/<cliente>.md` (prompt
 * `convenzione_studio_db`). Ogni output è una BOZZA: la decisione resta del
 * cliente, i profili fiscali/notarili vanno confermati col professionista.
 */
export function registerValutaIngressoItalia(server: McpServer) {
  registerGatedTool(
    server,
    "valuta_ingresso_italia",
    "Advisor per una società USA che vuole entrare nel mercato italiano: valuta il caso reale " +
      "(cosa farà in Italia, dove vivono i founder, se assumerà, se rimpatria utili, presenza " +
      "fisica) e raccomanda il veicolo giusto tra posizione IVA (rappresentante fiscale), ufficio " +
      "di rappresentanza, branch (stabile organizzazione) e S.r.l. controllata — NON assume che " +
      "sia una S.r.l. Restituisce: riepilogo della situazione, raccomandazione con motivi e " +
      "alternative, risposte alle domande chiave (con fonti e DA VERIFICARE), un piano di partenza, " +
      "e una bozza di proposta di incarico dello studio. Quando la risposta è la S.r.l., instrada a " +
      "`costituzione_controllata_usa`. Ogni output è una BOZZA: la decisione resta del cliente. " +
      "Stato in `studio/ingresso/<cliente>.md`.",
    {
      cliente: z.string().optional().describe("Nome del cliente/società USA, per intestazione e file di stato"),
      obiettivo: z.string().optional().describe("L'obiettivo del cliente in parole sue (es. 'vendere il nostro software in Italia', 'aprire un ufficio e assumere 3 persone')"),
      us_entity: z.string().optional().describe("Entità USA esistente (denominazione/tipo, es. 'Acme Inc., Delaware')"),
      attivita: z
        .enum(["solo_vendite", "promozione", "operazioni", "holding_ip", "rd"])
        .optional()
        .describe("Cosa farà in Italia: solo_vendite (vende senza struttura), promozione (marketing/ricerca, no vendite), operazioni (opera/eroga/produce), holding_ip (detiene partecipazioni/IP), rd (ricerca e sviluppo)"),
      presenza_fisica: z
        .enum(["nessuna", "magazzino", "ufficio", "punto_vendita"])
        .optional()
        .describe("Impronta fisica in Italia"),
      assumera_personale: z.boolean().optional().describe("Assumerà personale in Italia"),
      conclude_contratti_in_italia: z.boolean().optional().describe("Un soggetto in Italia concluderà abitualmente contratti in nome della società (rischio agency PE)"),
      distribuira_utili: z.boolean().optional().describe("Vuole rimpatriare utili al parent USA"),
      vuole_responsabilita_limitata: z.boolean().optional().describe("Vuole lo scudo della responsabilità limitata (separare il rischio italiano dal gruppo USA)"),
      residenza_founder: z
        .enum(["usa", "italia", "misto"])
        .optional()
        .describe("Dove vivono/gestiscono i founder: usa, italia, misto — determina il rischio esterovestizione"),
      orizzonte: z
        .enum(["test", "stabile"])
        .optional()
        .describe("Test di mercato (temporaneo) vs presenza stabile"),
    },
    async (args) => {
      const input: IngressoInput = {
        obiettivo: args.obiettivo,
        attivita: args.attivita as Attivita | undefined,
        presenzaFisica: args.presenza_fisica as PresenzaFisica | undefined,
        assumeraPersonale: args.assumera_personale,
        concludeContrattiInItalia: args.conclude_contratti_in_italia,
        distribuiraUtili: args.distribuira_utili,
        vuoleResponsabilitaLimitata: args.vuole_responsabilita_limitata,
        residenzaFounder: args.residenza_founder as ResidenzaFounder | undefined,
        orizzonte: args.orizzonte as Orizzonte | undefined,
        usEntity: args.us_entity,
      };

      const racc = raccomandaVeicolo(input);
      const info = VEICOLI[racc.principale];
      const L: string[] = [];

      L.push(`ORIENTAMENTO INGRESSO IN ITALIA — ${args.cliente ?? "società USA"}`);
      L.push("");

      // 1) Riepilogo della situazione (così il cliente si sente capito).
      L.push("LA TUA SITUAZIONE (come l'ho capita — correggimi se sbaglio):");
      if (args.obiettivo) L.push(`- Obiettivo: ${args.obiettivo}`);
      if (args.us_entity) L.push(`- Società USA: ${args.us_entity}`);
      if (args.attivita) L.push(`- Attività in Italia: ${args.attivita.replace(/_/g, " ")}`);
      if (args.presenza_fisica) L.push(`- Presenza fisica: ${args.presenza_fisica}`);
      if (args.assumera_personale !== undefined) L.push(`- Assunzioni in Italia: ${args.assumera_personale ? "sì" : "no"}`);
      if (args.distribuira_utili !== undefined) L.push(`- Rimpatrio utili al parent: ${args.distribuira_utili ? "sì" : "no"}`);
      if (args.residenza_founder) L.push(`- Residenza dei founder: ${args.residenza_founder}`);
      if (args.orizzonte) L.push(`- Orizzonte: ${args.orizzonte === "test" ? "test di mercato" : "presenza stabile"}`);
      L.push("");

      // 2) Raccomandazione.
      L.push(`OPZIONE CONSIGLIATA: ${info.nome}`);
      L.push(info.cosa);
      L.push(`Fonte: ${info.fonte}`);
      L.push("");
      L.push("Perché:");
      for (const m of racc.motivi) L.push(`- ${m}`);
      L.push("");
      if (racc.alternative.length > 0) {
        L.push("Alternative (e quando diventano preferibili):");
        for (const a of racc.alternative)
          L.push(`- ${VEICOLI[a.veicolo].nome}: ${a.quando}`);
        L.push("");
      }
      L.push("Da presidiare (⚠️ punti da verificare col professionista):");
      for (const b of racc.bandiere) L.push(`- ${b}`);
      L.push("");

      // 3) Risposte alle domande chiave.
      L.push("RISPOSTE ALLE DOMANDE CHIAVE:");
      for (const { domanda, risposta } of faqPersonalizzate(racc.principale, input)) {
        L.push(`Q: ${domanda}`);
        L.push(`R: ${risposta}`);
      }
      L.push("");

      // 4) Piano di partenza.
      L.push("PIANO DI PARTENZA:");
      for (const p of pianoDiPartenza(racc.principale, input)) L.push(p);
      if (racc.principale === "srl") {
        L.push(
          "→ Passo successivo: chiama `costituzione_controllata_usa` per la roadmap completa " +
            "della S.r.l. (documenti, apostille, atto, adempimenti, fiscalità).",
        );
      }
      L.push("");

      // 5) Proposta di incarico (bozza).
      for (const r of bozzaPropostaIncarico(racc.principale, input)) L.push(r);
      L.push("");

      // 6) Persistenza dello stato.
      const slug = (args.cliente ?? args.us_entity ?? "cliente")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      L.push(
        `Aggiorna \`studio/ingresso/${slug}.md\` con la situazione raccolta, il veicolo consigliato ` +
          "e lo stato della proposta di incarico (inviata/accettata). È il punto di partenza se il " +
          "cliente prosegue con lo studio.",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
