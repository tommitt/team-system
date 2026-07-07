import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP prompts — la parte "metodo + template" delle skill, che vive nel server ma
 * guida il client (Claude Code). Non consumano il gate di billing (sono
 * template, non chiamate a tool). S7 estrazione e L2 tono di comunicazione.
 */
export function registerPrompts(server: McpServer) {
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
