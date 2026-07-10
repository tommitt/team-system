/**
 * Interruttori del retrieval del corpus (ADR 0014).
 *
 * DECISIONE: variabili ESPLICITE, non legate alla sola presenza di
 * `COHERE_API_KEY`. La chiave dice "ho le credenziali", non "voglio questo
 * comportamento": il reranker è una chiamata a pagamento sull'hot path che si
 * può voler spegnere tenendo gli embedding, e il solo-FTS è utile per debug o
 * per tagliare i costi anche con la chiave presente. Legare tutto alla chiave
 * costringerebbe a cancellarla — uccidendo anche l'embedding di ingestione
 * (`embed-missing.ts`) — solo per ottenere questi stati a query-time.
 *
 * DEFAULT: attivi quando la chiave c'è, così il caso comune non richiede alcuna
 * variabile. Opt-out mettendo la variabile a `false`/`0`/`off`/`no`.
 *
 * Questi flag sono l'INTENZIONE dell'operatore. Se poi la chiave manca o Cohere
 * cade, `search.ts` degrada comunque e lo DICHIARA (contratto ADR 0011: mai un
 * risultato peggiore spacciato per buono).
 */

function flag(nome: string, def: boolean): boolean {
  const v = process.env[nome];
  if (v === undefined || v.trim() === "") return def;
  return !/^(false|0|off|no)$/i.test(v.trim());
}

/** Ricerca densa (embedding della query + ramo kNN) a query-time. Default: on. */
export function embeddingsAbilitati(): boolean {
  return flag("CORPUS_EMBEDDINGS", true);
}

/** Reranker Cohere rerank-3.5 sul top-N fuso. Default: on. */
export function rerankAbilitato(): boolean {
  return flag("CORPUS_RERANK", true);
}
