/**
 * Reranker Cohere rerank-3.5 (ADR 0014 §2, stadio di qualità dopo la fusione).
 *
 * `corpus_hybrid_search` fonde FTS + kNN con RRF e restituisce un pool ampio; il
 * reranker riordina quel pool per rilevanza semantica vera query↔passaggio e lo
 * taglia al top-N. È il singolo lever di qualità più grande dopo il chunking —
 * ma è una chiamata a pagamento sull'hot path, quindi è disattivabile
 * (`CORPUS_RERANK`, vedi `config.ts`) e degrada all'ordine RRF grezzo se assente
 * o se la chiamata fallisce (la logica di degradazione vive in `search.ts`).
 *
 * Come `embeddings.ts`, questo modulo NON è `server-only`: la chiave sta in
 * `COHERE_API_KEY` (nessun prefisso `NEXT_PUBLIC_`, resta fuori dal bundle
 * client) e va letta solo da codice server (`search.ts`, che è `server-only`).
 */
import { chiaveCohere } from "./embeddings";

const MODELLO = "rerank-3.5";
const ENDPOINT = "https://api.cohere.com/v2/rerank";
/** Cap difensivo per documento: i chunk stanno ampiamente sotto il contesto del reranker. */
const MAX_CARATTERI_DOC = 4000;

/**
 * Riordina `documenti` per rilevanza rispetto a `query`. Restituisce gli INDICI
 * (in `documenti`), migliore per primo, lunghezza ≤ `topN`. Non muta l'input.
 */
export async function rerankaDocumenti(
  query: string,
  documenti: string[],
  topN: number,
): Promise<number[]> {
  if (documenti.length === 0) return [];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${chiaveCohere()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELLO,
      query,
      documents: documenti.map((d) => d.slice(0, MAX_CARATTERI_DOC)),
      top_n: Math.min(topN, documenti.length),
    }),
  });

  if (!res.ok) {
    throw new Error(`Cohere rerank ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    results?: { index: number; relevance_score: number }[];
  };
  if (!json.results) throw new Error("Cohere rerank: risposta senza `results`");
  return json.results.map((r) => r.index);
}

/**
 * Applica un ordinamento di indici a una lista, difensivamente: ignora indici
 * fuori range o duplicati, tronca a `limite`. Puro e testabile — separato dalla
 * chiamata di rete così la logica di riordino non richiede Cohere per il test.
 */
export function applicaRerank<T>(
  risultati: readonly T[],
  indiciOrdinati: readonly number[],
  limite: number,
): T[] {
  const visti = new Set<number>();
  const out: T[] = [];
  for (const i of indiciOrdinati) {
    if (i >= 0 && i < risultati.length && !visti.has(i)) {
      visti.add(i);
      out.push(risultati[i]);
      if (out.length >= limite) break;
    }
  }
  return out;
}

export { MODELLO };
