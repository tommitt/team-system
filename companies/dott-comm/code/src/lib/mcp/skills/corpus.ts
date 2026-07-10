import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { DISCLAIMER_BOZZA } from "@/lib/fiscal/constants";
import { annoMassimoCoperto, copertura } from "@/lib/corpus/copertura";
import {
  avvisoCopertura,
  formattaCopertura,
  formattaRisultato,
  nomeFonte,
  pagine,
} from "@/lib/corpus/format";
import {
  cercaFonti,
  cercaNorma,
  documentiIndice,
  leggiIntorno,
} from "@/lib/corpus/search";

/**
 * I quattro tool `corpus_*` — il grounding delle domande puntuali (ADR 0014).
 *
 * Non un solo `cerca()`: quello è la trappola della RAG one-shot. Diamo al
 * modello le mosse di un ricercatore umano — cerca, leggi la sezione intorno,
 * risali alla norma, sfoglia l'indice — così può ITERARE fino alla fonte giusta.
 *
 * Due regole dure, applicate qui e non lasciate al buon cuore del modello:
 *  1. **Nessuna fonte recuperata, nessuna asserzione**: ogni risultato esce con
 *     estremi, sezione, pagina e URL verificabili.
 *  2. **L'avviso temporale è obbligatorio**: se la domanda riguarda un anno
 *     d'imposta fuori dalla vigenza del testo o dalla copertura del corpus,
 *     l'avviso viene PRIMA dei risultati (contratto di `lookupVigente`, ADR 0011).
 *
 * Il corpus contiene solo fonti pubbliche: nessun dato di studio o di cliente
 * (carve-out esplicito all'ADR 0003).
 */

const FONTI = ["prassi_ade", "istruzioni_modelli", "normattiva"] as const;

const descrizioneFonte = z
  .enum(FONTI)
  .describe(
    "Restringe la ricerca a una fonte: 'prassi_ade' (circolari, risoluzioni, " +
      "interpelli), 'istruzioni_modelli' (istruzioni ai modelli dichiarativi), " +
      "'normattiva' (testo delle norme). Ometti per cercare ovunque.",
  );

export function registerCorpus(server: McpServer) {
  registerCerca(server);
  registerLeggi(server);
  registerNorma(server);
  registerIndice(server);
}

/** `corpus_cerca` — ricerca ibrida con filtri e avvisi temporali. */
function registerCerca(server: McpServer) {
  registerGatedTool(
    server,
    "corpus_cerca",
    "Cerca nelle fonti fiscali ufficiali (prassi Agenzia delle Entrate, istruzioni ai modelli, " +
      "Normattiva) con ricerca ibrida full-text + semantica. Usalo SEMPRE prima di rispondere a " +
      "una domanda fiscale puntuale: ogni risultato porta estremi, sezione, pagina e URL, così la " +
      "risposta si può citare e verificare. Se nessun risultato è pertinente, dillo — non " +
      "rispondere a memoria. Indica l'anno d'imposta della domanda: il tool avverte se le fonti " +
      "trovate riguardano un altro anno o se il corpus non copre quell'anno.",
    {
      domanda: z
        .string()
        .min(3)
        .describe(
          "La domanda o i termini da cercare, in italiano (es. 'tassazione fringe benefit auto uso promiscuo')",
        ),
      anno_imposta: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe(
          "Anno d'imposta a cui si riferisce la domanda. Attiva gli avvisi temporali: indicalo sempre quando la domanda riguarda un anno preciso.",
        ),
      fonte: descrizioneFonte.optional(),
      max_risultati: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(8)
        .describe("Quanti risultati restituire (1-20, default 8)"),
    },
    async ({ domanda, anno_imposta, fonte, max_risultati }) => {
      const [esito, coperture] = await Promise.all([
        cercaFonti({ domanda, fonte, annoImposta: anno_imposta, limit: max_risultati }),
        copertura(),
      ]);

      const L: string[] = [];
      L.push(`RICERCA NEL CORPUS — "${domanda}"`);
      if (anno_imposta) L.push(`Anno d'imposta: ${anno_imposta}`);
      if (fonte) L.push(`Fonte: ${nomeFonte(fonte)}`);
      L.push("");

      // L'avviso di copertura viene PRIMA dei risultati: è l'unico che nessun
      // singolo risultato può dare da sé.
      const avviso = avvisoCopertura(anno_imposta, annoMassimoCoperto(coperture));
      if (avviso) {
        L.push(avviso);
        L.push("");
      }
      // Avvisi di degradazione (solo full-text, rerank caduto): il modello deve
      // sapere che la ricerca è girata in modalità ridotta.
      for (const n of esito.note) L.push(`⚠️ ${n}`);
      if (esito.note.length > 0) L.push("");

      if (esito.risultati.length === 0) {
        L.push(
          "Nessuna fonte trovata. NON rispondere a memoria: dillo all'utente, " +
            "prova a riformulare la domanda, oppure controlla con `corpus_indice` " +
            "se la fonte che serve è stata indicizzata.",
        );
        L.push("");
        L.push(formattaCopertura(coperture));
        L.push("");
        L.push(DISCLAIMER_BOZZA);
        return { content: [{ type: "text", text: L.join("\n") }] };
      }

      esito.risultati.forEach((r, i) => {
        L.push(formattaRisultato(r, i + 1, anno_imposta));
        L.push("");
      });

      L.push(formattaCopertura(coperture));
      L.push("");
      L.push(
        "Cita sempre la fonte (estremi, sezione, pagina). Per leggere il contesto " +
          "completo attorno a un risultato usa `corpus_leggi`; per il testo di una " +
          "norma citata usa `corpus_norma`.",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);
      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}

/** `corpus_leggi` — espande il contesto attorno a un chunk trovato. */
function registerLeggi(server: McpServer) {
  registerGatedTool(
    server,
    "corpus_leggi",
    "Legge il testo attorno a un risultato di `corpus_cerca`, cioè i chunk adiacenti dello stesso " +
      "documento. I chunk servono a TROVARE, le sezioni a LEGGERE: usa questo tool prima di " +
      "rispondere quando il frammento trovato è troncato o rimanda al contesto (\"ai sensi del " +
      "comma precedente\", \"il predetto termine\").",
    {
      chunk_id: z
        .number()
        .int()
        .describe("L'id del chunk restituito da `corpus_cerca` (campo chunk_id)"),
      contesto: z
        .number()
        .int()
        .min(0)
        .max(10)
        .default(2)
        .describe("Quanti chunk adiacenti includere prima e dopo (0-10, default 2)"),
    },
    async ({ chunk_id, contesto }) => {
      const esito = await leggiIntorno(chunk_id, contesto);
      if (!esito) {
        return {
          content: [
            {
              type: "text",
              text: `Nessun chunk con id ${chunk_id}. Rilancia corpus_cerca per ottenere id validi.`,
            },
          ],
        };
      }

      const { documento, chunks } = esito;
      const L: string[] = [];
      L.push(`${documento.estremi}${documento.titolo ? ` — ${documento.titolo}` : ""}`);
      L.push(`Fonte: ${nomeFonte(documento.fonte)} · ${documento.url_origine}`);
      if (documento.anno_imposta) L.push(`Anno d'imposta: ${documento.anno_imposta}`);
      L.push("");

      for (const c of chunks) {
        const marcatore = c.id === chunk_id ? "▶" : " ";
        const pp = pagine({ paginaDa: c.pagina_da, paginaA: c.pagina_a });
        L.push(`${marcatore} [chunk ${c.id}] ${c.percorso}${pp ? ` — ${pp}` : ""}`);
        L.push(c.testo);
        L.push("");
      }

      L.push(DISCLAIMER_BOZZA);
      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}

/** `corpus_norma` — lookup diretto di un articolo + chi lo cita (grafo citazionale). */
function registerNorma(server: McpServer) {
  registerGatedTool(
    server,
    "corpus_norma",
    "Recupera il testo di un articolo di legge e la prassi che lo cita. Accetta il riferimento in " +
      "qualunque grafia ('art. 51 TUIR', 'articolo 17, comma 6, del DPR 633/1972', 'D.Lgs. 546/1992'). " +
      "Usalo quando una circolare rimanda a una norma: la prassi spiega, ma l'AUTORITÀ è la norma — " +
      "cita la norma e usa la prassi come spiegazione.",
    {
      riferimento: z
        .string()
        .min(3)
        .describe("Il riferimento normativo, es. 'art. 51, comma 2, TUIR' o 'DPR 633/1972'"),
      anno_imposta: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe("Anno d'imposta di interesse, per gli avvisi temporali"),
    },
    async ({ riferimento, anno_imposta }) => {
      const esito = await cercaNorma(riferimento);
      const L: string[] = [];

      if (!esito) {
        L.push(
          `Riferimento non riconosciuto: "${riferimento}". Indica l'atto in modo esplicito ` +
            `(es. "art. 51 TUIR" oppure "art. 3 del D.Lgs. 471/1997").`,
        );
        L.push("");
        L.push(DISCLAIMER_BOZZA);
        return { content: [{ type: "text", text: L.join("\n") }] };
      }

      L.push(`NORMA — ${esito.riferimento.riferimento}`);
      if (esito.riferimento.urn) L.push(`URN Normattiva: ${esito.riferimento.urn}`);
      if (esito.documento) L.push(`Fonte: ${esito.documento.url_origine}`);
      L.push("");

      const avviso = avvisoCopertura(anno_imposta, new Date().getFullYear());
      if (avviso) L.push(avviso, "");

      if (esito.articolo.length > 0) {
        L.push("TESTO VIGENTE");
        for (const c of esito.articolo) {
          L.push(`  ${c.percorso}`);
          L.push(c.testo);
          L.push("");
        }
      } else if (esito.documento) {
        L.push(
          `L'atto è in corpus ma l'articolo ${esito.riferimento.articolo ?? "richiesto"} ` +
            `non è stato trovato: potrebbe essere abrogato, o numerato diversamente.`,
        );
        L.push("");
      } else {
        L.push(
          "⚠️ Questo atto NON è ancora indicizzato nel corpus: il testo dell'articolo non è " +
            "disponibile qui. Non riportarlo a memoria — consultalo su Normattiva.",
        );
        L.push("");
      }

      if (esito.citanti.length > 0) {
        L.push(`PRASSI CHE CITA QUESTA NORMA (${esito.citanti.length})`);
        for (const c of esito.citanti) {
          const d = c.chunk.documento;
          L.push(`  · ${d.estremi} — ${c.chunk.percorso.split(" > ").slice(1).join(" > ")}`);
          L.push(`    [chunk ${c.chunk.id}] ${d.url_origine}`);
        }
        L.push("");
        L.push("Usa `corpus_leggi` su uno di questi chunk per leggerne il contesto.");
      } else {
        L.push("Nessun documento in corpus cita esplicitamente questa norma.");
      }

      L.push("");
      L.push(DISCLAIMER_BOZZA);
      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}

/** `corpus_indice` — naviga il corpus invece di cercarlo. */
function registerIndice(server: McpServer) {
  registerGatedTool(
    server,
    "corpus_indice",
    "Elenca i documenti indicizzati nel corpus e la copertura temporale per fonte. Usalo per " +
      "sapere COSA c'è (e fino a quando è aggiornato) prima di affermare che una fonte manca, o " +
      "quando l'utente chiede se un certo documento è consultabile.",
    {
      fonte: descrizioneFonte.optional(),
      anno: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe("Filtra i documenti per anno d'imposta"),
    },
    async ({ fonte, anno }) => {
      const [documenti, coperture] = await Promise.all([
        documentiIndice({ fonte, anno }),
        copertura(),
      ]);

      const L: string[] = [];
      L.push("INDICE DEL CORPUS");
      L.push("");
      L.push(formattaCopertura(coperture));
      L.push("");

      for (const c of coperture) {
        if (c.ultimaIngestione) {
          L.push(`  ultima ingestione ${nomeFonte(c.fonte)}: ${c.ultimaIngestione.slice(0, 10)}`);
        }
      }
      L.push("");

      if (documenti.length === 0) {
        L.push("Nessun documento corrisponde ai filtri indicati.");
      } else {
        let fonteCorrente = "";
        for (const d of documenti) {
          if (d.fonte !== fonteCorrente) {
            fonteCorrente = d.fonte;
            L.push("");
            L.push(`── ${nomeFonte(fonteCorrente)} ──`);
          }
          const dettagli = [
            d.data_pubblicazione,
            d.anno_imposta ? `anno d'imposta ${d.anno_imposta}` : null,
          ].filter(Boolean);
          L.push(`  · ${d.estremi}${dettagli.length ? ` (${dettagli.join(", ")})` : ""}`);
          if (d.titolo) L.push(`    ${d.titolo}`);
        }
      }

      L.push("");
      L.push(DISCLAIMER_BOZZA);
      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
