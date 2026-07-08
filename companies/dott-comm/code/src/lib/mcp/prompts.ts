import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP prompts — la parte "metodo + template" delle skill, che vive nel server ma
 * guida il client (Claude Code). Non consumano il gate di billing (sono
 * template, non chiamate a tool). S7 estrazione, L2 tono di comunicazione,
 * T1 convenzione studio-db (lo stato client-local, ADR 0003).
 */
export function registerPrompts(server: McpServer) {
  server.prompt(
    "convenzione_studio_db",
    "La convenzione `studio/` — i file markdown dello studio che fanno da database client-local " +
      "(anagrafica, scadenzario, stato campagne). Il server non persiste nulla: lo stato vive qui.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Mantieni lo stato dello studio in una cartella `studio/` nella workspace, in markdown (leggibile dal professionista, aggiornabile da te). Il server Dott. Comm. non salva MAI questi dati: sono dello studio.",
              "",
              "Struttura:",
              "- `studio/clienti.md` — l'anagrafica: una tabella con colonne `Cliente | Regime | Forma | IVA | Sostituto | INPS art/comm | Immobili | Note`. È la fonte degli attributi per `scadenze_cliente` e per le campagne.",
              "- `studio/scadenzario.md` — la matrice operativa: `Cliente | Scadenza | Adempimento | Assegnatario | Stato` (stati: `da fare`, `in corso`, `fatto`, `inviato`, `confermato`). Alimentato da `scadenze_cliente` e da `triage_atto`; ordinato per data.",
              "- `studio/raccolta/<campagna>.md` — stato di una campagna di raccolta documenti: `Cliente | Mancanti | Sollecitato il | Stato`. Alimentato da `raccolta_documenti`.",
              "- `studio/versamenti/<scadenza>.md` — stato delle comunicazioni di versamento: `Cliente | Importo | Canale | Inviata il | Confermata`. Alimentato da `comunica_versamenti`.",
              "",
              "Regole:",
              "- Date sempre assolute (YYYY-MM-DD), mai relative.",
              "- Una riga per item; aggiorna la riga esistente invece di duplicarla.",
              "- Dopo ogni azione (sollecito inviato, pagamento confermato, atto registrato) aggiorna subito il file corrispondente: è l'audit trail dello studio.",
              "- Prima di una campagna, leggi il file di stato per riprendere da dove si era rimasti.",
              "- Per derivare `documenti_presenti` di `raccolta_documenti`, scandisci la cartella documenti dello studio (o l'export della casella email) invece di chiedere all'utente, quando possibile.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "metodo_estrazione_documenti",
    "Metodo per estrarre dati strutturati da ricevute, scontrini, fatture estere ed export " +
      "gestionale, pronti per `estrai_documenti`.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Estrai da ogni documento una riga con questi campi, poi passa l'elenco al tool `estrai_documenti`:",
              "- tipo (fattura, ricevuta, scontrino, nota di credito, contratto)",
              "- data (così com'è nel documento; il tool la normalizza)",
              "- importo (totale documento; per le fatture indica imponibile e IVA se distinti)",
              "- controparte (fornitore/cliente)",
              "- piva_cf (partita IVA o codice fiscale, se presente)",
              "- descrizione (oggetto/causale)",
              "",
              "Regole:",
              "- Non inventare valori: se un campo è illeggibile lascialo vuoto, il tool lo segnalerà come dubbio.",
              "- Per le fatture estere annota la valuta e che alimentano esterometro/TD17-19.",
              "- Segnala separatamente i documenti totalmente illeggibili invece di indovinare.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "tono_comunicazione_studio",
    "Linee guida di tono per le bozze di comunicazione al cliente (usate con `comunica_versamenti` " +
      "e `raccolta_documenti`).",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Quando riscrivi le bozze di comunicazione al cliente, mantieni questo tono:",
              "- Professionale ma cordiale, del 'tu' salvo indicazione diversa; italiano semplice, niente gergo fiscale non spiegato.",
              "- Chiaro su cosa fare e entro quando; un'unica call-to-action per messaggio.",
              "- Rassicurante sui timori tipici (proroga, rateizzazione, sanzioni) senza promettere nulla che il professionista non abbia confermato.",
              "- Ogni comunicazione resta una BOZZA: la invia lo studio dopo revisione, la responsabilità è del professionista.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
