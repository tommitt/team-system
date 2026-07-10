/**
 * Embeddings del corpus — Cohere embed-v4 (ADR 0014 §4).
 *
 * Chiamata via `fetch`: nessun SDK da installare per due endpoint. Cohere
 * distingue `search_document` (indicizzazione) da `search_query` (ricerca) e
 * produce vettori asimmetrici: usare il tipo sbagliato degrada il recall in
 * silenzio, quindi il tipo è un parametro esplicito e non ha default.
 *
 * NB: questo modulo NON è marcato `server-only`, a differenza del resto di
 * `lib/corpus/`, perché lo importa anche `scripts/ingest/embed-missing.ts`, che
 * gira sotto `tsx` fuori da Next (e `server-only` là solleverebbe). La chiave
 * vive in `COHERE_API_KEY` — senza prefisso `NEXT_PUBLIC_`, quindi resta fuori
 * dal bundle client — e va letta solo da codice server.
 */

const MODELLO = "embed-v4.0";
const DIMENSIONI = 1024; // deve combaciare con `vector(1024)` in 04_corpus.sql
const ENDPOINT = "https://api.cohere.com/v2/embed";

export type TipoInput = "search_document" | "search_query";

export function chiaveCohere(): string {
  const chiave = process.env.COHERE_API_KEY;
  if (!chiave) {
    throw new Error(
      "COHERE_API_KEY non impostata: il corpus non può né indicizzare né cercare.",
    );
  }
  return chiave;
}

/** La chiave c'è? Query-time usa questo per decidere se degradare senza sollevare. */
export function haChiaveCohere(): boolean {
  return !!process.env.COHERE_API_KEY;
}

/** Un lotto di testi → un lotto di vettori, nello stesso ordine. */
export async function embedTesti(
  testi: string[],
  tipo: TipoInput,
): Promise<number[][]> {
  if (testi.length === 0) return [];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${chiaveCohere()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELLO,
      input_type: tipo,
      output_dimension: DIMENSIONI,
      embedding_types: ["float"],
      texts: testi,
    }),
  });

  if (!res.ok) {
    throw new Error(`Cohere ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { embeddings: { float: number[][] } };
  const vettori = json.embeddings?.float;
  if (!vettori || vettori.length !== testi.length) {
    throw new Error(
      `Cohere: attesi ${testi.length} vettori, ricevuti ${vettori?.length ?? 0}`,
    );
  }
  return vettori;
}

/** Embedding della domanda dell'utente (lato query). */
export async function embedQuery(testo: string): Promise<number[]> {
  const [vettore] = await embedTesti([testo], "search_query");
  return vettore;
}

/**
 * Testo da embeddare per un chunk: percorso + testo ("contextual retrieval").
 * Il percorso gerarchico dice al vettore DOVE si trova il pezzo, e senza di
 * esso un comma che dice solo "la percentuale è del 20%" non è recuperabile.
 */
export function testoDaEmbeddare(percorso: string, testo: string): string {
  return `${percorso}\n${testo}`;
}

export { DIMENSIONI, MODELLO };
