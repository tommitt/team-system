import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import {
  parseImportoIt,
  parseDataIt,
  validaPartitaIva,
  validaCodiceFiscale,
} from "@/lib/parse/it-formats";

/**
 * S7 `estrai_documenti` — normalizza e valida le righe che il client (Claude
 * Code) ha già estratto da ricevute/scontrini/fatture estere/export gestionale.
 * Il server non fa OCR: fa la parte deterministica e verificabile (formati it di
 * date/importi, check digit P.IVA, forma CF) e restituisce una tabella pulita +
 * la coda di righe dubbie da rivedere. Vedi il prompt `metodo_estrazione`.
 */
export function registerEstraiDocumenti(server: McpServer) {
  registerGatedTool(
    server,
    "estrai_documenti",
    "Normalizza e valida righe di documenti già estratte dal client (date e importi in " +
      "formato italiano → ISO/numero, check digit della partita IVA, forma del codice " +
      "fiscale). Restituisce la tabella normalizzata + l'elenco delle righe dubbie da " +
      "rivedere. Non esegue OCR: l'estrazione da PDF/foto la fa il client; questo tool fa la " +
      "parte deterministica.",
    {
      righe: z
        .array(
          z.object({
            tipo: z.string().optional().describe("Tipo documento (fattura, ricevuta, ...)"),
            data: z.string().optional().describe("Data come estratta (qualsiasi formato)"),
            importo: z.string().optional().describe("Importo come estratto (formato it o num)"),
            controparte: z.string().optional().describe("Fornitore/cliente"),
            piva_cf: z.string().optional().describe("Partita IVA o codice fiscale"),
            descrizione: z.string().optional().describe("Descrizione libera"),
          }),
        )
        .describe("Righe estratte dal client, da normalizzare/validare"),
    },
    async ({ righe }) => {
      type Normalizzata = {
        indice: number;
        tipo?: string;
        data: string | null;
        importo: number | null;
        controparte?: string;
        piva_cf?: string;
        piva_cf_valido: boolean | null;
        descrizione?: string;
        dubbi: string[];
      };

      const normalizzate: Normalizzata[] = righe.map((r, i) => {
        const dubbi: string[] = [];

        let data: string | null = null;
        if (r.data && r.data.trim() !== "") {
          data = parseDataIt(r.data);
          if (data === null) dubbi.push(`data non interpretabile ("${r.data}")`);
        } else {
          dubbi.push("data mancante");
        }

        let importo: number | null = null;
        if (r.importo && r.importo.trim() !== "") {
          importo = parseImportoIt(r.importo);
          if (importo === null)
            dubbi.push(`importo non interpretabile ("${r.importo}")`);
        } else {
          dubbi.push("importo mancante");
        }

        let pivaCfValido: boolean | null = null;
        if (r.piva_cf && r.piva_cf.trim() !== "") {
          const v = r.piva_cf.replace(/\s/g, "");
          pivaCfValido = /^\d{11}$/.test(v)
            ? validaPartitaIva(v)
            : validaCodiceFiscale(v);
          if (!pivaCfValido)
            dubbi.push(`partita IVA / codice fiscale non valido ("${r.piva_cf}")`);
        }

        return {
          indice: i,
          tipo: r.tipo,
          data,
          importo,
          controparte: r.controparte,
          piva_cf: r.piva_cf,
          piva_cf_valido: pivaCfValido,
          descrizione: r.descrizione,
          dubbi,
        };
      });

      const dubbie = normalizzate.filter((r) => r.dubbi.length > 0);
      const ok = normalizzate.length - dubbie.length;

      const L: string[] = [];
      L.push(
        `Normalizzate ${normalizzate.length} righe: ${ok} ok, ${dubbie.length} da rivedere.`,
      );
      if (dubbie.length > 0) {
        L.push("");
        L.push("Righe dubbie:");
        for (const r of dubbie) {
          L.push(`- riga ${r.indice}: ${r.dubbi.join("; ")}`);
        }
      }
      L.push("");
      L.push("Dati normalizzati (JSON):");
      L.push("```json");
      L.push(JSON.stringify(normalizzate, null, 2));
      L.push("```");

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
