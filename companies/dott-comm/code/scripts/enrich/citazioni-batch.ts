/**
 * Pass LLM di estrazione citazioni per il residuo ambiguo (ADR 0014 §7).
 *
 * La regex (`scripts/ingest/lib/citazioni.ts`) copre la massa deterministica a
 * costo zero. Restano le citazioni ELLITTICHE — "il medesimo articolo", "la
 * norma sopra citata", riferimenti che rimandano al contesto — che una regex non
 * può risolvere senza indovinare (e indovinare corrompe il grafo). Quelle vanno
 * a un modello, via Batch API (−50%), e atterrano `metodo='llm', approvata=false`:
 * il sign-off umano (`/verifica-fonti`) le promuove prima che escano da un tool.
 *
 * Strategia di selezione: si prendono i chunk di prassi/istruzioni che PARLANO di
 * articoli ("art. ", "comma ") ma su cui la regex ha estratto POCHE citazioni —
 * sono i candidati a contenere riferimenti ellittici. Non tutto il corpus: solo
 * dove c'è probabile segnale mancato.
 *
 *   npm run enrich:citazioni -- --limit 200            # default claude-haiku-4-5
 *   npm run enrich:citazioni -- --model claude-sonnet-5 --limit 50
 */
import { getDb } from "../ingest/lib/db";
import { eseguiScript, parseArgv } from "../ingest/lib/cli";
import {
  attendiBatch,
  creaBatch,
  risultatiBatch,
  type ModelloEnrichment,
  type RichiestaBatch,
} from "./lib/anthropic-batch";
import { normalizzaRiferimento } from "../../src/lib/parse/riferimenti-norma";

const MODELLO_DEFAULT: ModelloEnrichment = "claude-haiku-4-5";

// Prompt condiviso, in testa e cache-abile (prompt caching, −costo sui batch).
const ISTRUZIONI = [
  "Sei un assistente che estrae SOLO citazioni normative esplicite da un passaggio",
  "di prassi fiscale italiana. Restituisci ogni riferimento a un atto normativo",
  "(legge, decreto, DPR, D.Lgs., TUIR, ecc.) con articolo e comma quando presenti.",
  "",
  "REGOLE FERREE:",
  "- Estrai solo ciò che è NEL TESTO. Non dedurre, non completare da conoscenza tua.",
  "- Se un riferimento è ellittico ('il medesimo articolo', 'la citata norma') e",
  "  il testo NON dice a quale atto si riferisce, NON includerlo.",
  "- Normalizza nella forma: sigla numero/anno, articolo, comma.",
  "- Mai inventare estremi. Nel dubbio, ometti.",
].join("\n");

const TOOL_CITAZIONI = {
  name: "registra_citazioni",
  description: "Registra le citazioni normative esplicite trovate nel passaggio.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      citazioni: {
        type: "array",
        description: "Una voce per riferimento normativo esplicito.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            atto: {
              type: "string",
              description: "Sigla + numero/anno, es. 'DPR 917/1986' o 'D.Lgs. 546/1992'",
            },
            articolo: { type: "string", description: "Numero d'articolo, o stringa vuota" },
            comma: { type: "string", description: "Numero di comma, o stringa vuota" },
          },
          required: ["atto", "articolo", "comma"],
        },
      },
    },
    required: ["citazioni"],
  },
};

type ChunkCandidato = { id: number; testo: string };

/**
 * Chunk di prassi/istruzioni che PARLANO di articoli ("art.", "comma") ma su cui
 * la regex ha reso poco: sono i candidati a contenere riferimenti ellittici. Non
 * tutto il corpus — solo dove c'è probabile segnale mancato. Il filtro sulla
 * fonte usa un inner join su `corpus_documenti` (la norma cita in modo meno
 * ellittico e la copre già bene la regex).
 */
async function candidati(limit: number): Promise<ChunkCandidato[]> {
  const { data, error } = await getDb()
    .from("corpus_chunks")
    .select("id, testo, corpus_documenti!inner(fonte)")
    .in("corpus_documenti.fonte", ["prassi_ade", "istruzioni_modelli"])
    .ilike("testo", "%art%")
    .order("id")
    .limit(limit);
  if (error) throw new Error(`selezione candidati: ${error.message}`);
  return (data ?? []).map((c) => ({ id: c.id as number, testo: c.testo as string }));
}

function richiestaPer(chunk: ChunkCandidato, modello: string): RichiestaBatch {
  return {
    custom_id: `chunk-${chunk.id}`,
    params: {
      model: modello,
      max_tokens: 1024,
      system: [{ type: "text", text: ISTRUZIONI, cache_control: { type: "ephemeral" } }],
      tools: [TOOL_CITAZIONI],
      tool_choice: { type: "tool", name: "registra_citazioni" },
      messages: [{ role: "user", content: `Passaggio:\n\n${chunk.testo}` }],
    },
  };
}

type CitazioneLlm = { atto: string; articolo: string; comma: string };

/** Salva le citazioni del modello, sempre `metodo='llm', approvata=false`. */
async function salvaCitazioni(chunkId: number, grezze: CitazioneLlm[]): Promise<number> {
  const db = getDb();
  const righe = grezze
    .map((c) => {
      const testoRif = [c.atto, c.articolo && `art. ${c.articolo}`, c.comma && `c. ${c.comma}`]
        .filter(Boolean)
        .join(", ");
      const norm = normalizzaRiferimento(testoRif);
      if (!norm) return null; // non riconosciuto → scartato, non inventato
      return {
        chunk_id: chunkId,
        riferimento: norm.riferimento,
        urn: norm.urn,
        testo_grezzo: testoRif,
        metodo: "llm" as const,
        approvata: false, // sign-off umano obbligatorio
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (righe.length === 0) return 0;
  // Evita doppioni con le citazioni regex già presenti sullo stesso chunk.
  const { data: esistenti } = await db
    .from("corpus_citazioni")
    .select("riferimento")
    .eq("chunk_id", chunkId);
  const gia = new Set((esistenti ?? []).map((e) => e.riferimento as string));
  const nuove = righe.filter((r) => !gia.has(r.riferimento));
  if (nuove.length === 0) return 0;

  const { error } = await db.from("corpus_citazioni").insert(nuove);
  if (error) throw new Error(`insert citazioni llm: ${error.message}`);
  return nuove.length;
}

async function main(): Promise<void> {
  const opts = parseArgv();
  const modello = (opts.model as ModelloEnrichment) ?? MODELLO_DEFAULT;
  const limit = opts.limit ?? 200;

  const chunks = await candidati(limit);
  console.log(`Candidati all'estrazione LLM: ${chunks.length} (modello ${modello})`);
  if (chunks.length === 0) return;

  if (opts.dryRun) {
    console.log("[dry-run] non invio il batch. Esempio di richiesta:");
    console.log(JSON.stringify(richiestaPer(chunks[0], modello), null, 2).slice(0, 600));
    return;
  }

  const richieste = chunks.map((c) => richiestaPer(c, modello));
  const batchId = await creaBatch(richieste);
  console.log(`Batch creato: ${batchId} — in attesa…`);

  const resultsUrl = await attendiBatch(batchId, (s) => process.stdout.write(`  stato: ${s}\r`));
  console.log("\nBatch completato, scarico i risultati.");

  const risultati = await risultatiBatch(resultsUrl);
  let inserite = 0;
  let falliti = 0;

  for (const r of risultati) {
    if (r.result.type !== "succeeded") {
      falliti++;
      continue;
    }
    const chunkId = Number(r.custom_id.replace("chunk-", ""));
    const blocco = r.result.message.content.find((b) => b.type === "tool_use");
    const input = blocco?.input as { citazioni?: CitazioneLlm[] } | undefined;
    if (input?.citazioni?.length) {
      inserite += await salvaCitazioni(chunkId, input.citazioni);
    }
  }

  console.log(
    `\n✓ ${inserite} citazioni LLM inserite (approvata=false, in attesa di /verifica-fonti)` +
      (falliti ? ` · ${falliti} richieste non riuscite` : ""),
  );
}

void eseguiScript(main);
