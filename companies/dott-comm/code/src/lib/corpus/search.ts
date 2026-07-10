import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { embedQuery, haChiaveCohere, testoDaEmbeddare } from "./embeddings";
import { embeddingsAbilitati, rerankAbilitato } from "./config";
import { applicaRerank, rerankaDocumenti } from "./rerank";
import {
  chiaveArticolo,
  normalizzaRiferimento,
  type Riferimento,
} from "@/lib/parse/riferimenti-norma";

/**
 * Libreria di retrieval sul corpus (ADR 0014).
 *
 * La ricerca vive in SQL (`corpus_hybrid_search`, versionata nello schema
 * dichiarativo) e si chiama via `.rpc()` con il client service-role: nessun
 * secondo ciclo di vita di connessioni su Vercel — il `pg` Pool resta riservato
 * a Better Auth.
 *
 * Le tabelle del corpus hanno RLS attiva e zero policy: solo la service-role
 * key le raggiunge. Non c'è dato di cliente qui dentro (carve-out ADR 0003):
 * il corpus è fatto di sole fonti pubbliche.
 */

export type Fonte = "prassi_ade" | "istruzioni_modelli" | "normattiva";

export type Risultato = {
  chunkId: number;
  documentoId: string;
  fonte: Fonte;
  tipo: string;
  estremi: string;
  titolo: string | null;
  urlOrigine: string;
  percorso: string;
  testo: string;
  seq: number;
  paginaDa: number | null;
  paginaA: number | null;
  annoImposta: number | null;
  vigenzaDa: string | null;
  vigenzaA: string | null;
  notaRedazionale: string | null;
  score: number;
};

let client: SupabaseClient | undefined;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non impostate.");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- le tabelle corpus non sono nei tipi generati del client billing */
type Riga = Record<string, any>;

function aRisultato(r: Riga): Risultato {
  return {
    chunkId: r.chunk_id,
    documentoId: r.documento_id,
    fonte: r.fonte,
    tipo: r.tipo,
    estremi: r.estremi,
    titolo: r.titolo,
    urlOrigine: r.url_origine,
    percorso: r.percorso,
    testo: r.testo,
    seq: r.seq,
    paginaDa: r.pagina_da,
    paginaA: r.pagina_a,
    annoImposta: r.anno_imposta,
    vigenzaDa: r.vigenza_da,
    vigenzaA: r.vigenza_a,
    notaRedazionale: r.nota_redazionale ?? null,
    score: r.score ?? 0,
  };
}

export type EsitoRicerca = {
  risultati: Risultato[];
  /** false quando la ricerca è degradata (es. solo full-text): i tool lo espongono. */
  ibrida: boolean;
  /** true quando il reranker Cohere ha riordinato i risultati. */
  rerankata: boolean;
  /** Avvisi di degradazione da esporre (contratto ADR 0011). */
  note: string[];
};

/** Quanti candidati fondere prima del rerank: si riordina un pool ampio, non il top-8. */
const POOL_RERANK = 40;

/**
 * Ricerca ibrida (full-text italiano + kNN denso, fusi con RRF), con reranking
 * opzionale Cohere rerank-3.5 come stadio di qualità finale.
 *
 * Due degradazioni, entrambe DICHIARATE (contratto `lookupVigente`, ADR 0011:
 * mai un risultato peggiore spacciato per uno buono):
 *   - se l'embedding della query non si calcola (flag off, chiave assente,
 *     Cohere giù) → solo full-text (`ibrida:false` + nota);
 *   - se il rerank è previsto ma fallisce → si tiene l'ordine RRF grezzo
 *     (`rerankata:false` + nota). Il rerank spento per scelta
 *     (`CORPUS_RERANK=false`) non è una degradazione: nessuna nota.
 */
export async function cercaFonti(opts: {
  domanda: string;
  fonte?: Fonte;
  annoImposta?: number;
  limit?: number;
}): Promise<EsitoRicerca> {
  const limite = opts.limit ?? 8;
  const note: string[] = [];
  const chiave = haChiaveCohere();

  // --- Ramo denso: embedding della query (o degradazione a solo FTS) ---------
  const usaDense = embeddingsAbilitati() && chiave;
  let embedding: number[] | null = null;
  if (usaDense) {
    try {
      embedding = await embedQuery(opts.domanda);
    } catch (err) {
      note.push(
        "Ricerca semantica non disponibile (" +
          (err instanceof Error ? err.message.slice(0, 80) : "errore") +
          "): risultati dal solo full-text.",
      );
    }
  } else if (!chiave) {
    note.push("Ricerca semantica non disponibile (COHERE_API_KEY assente): solo full-text.");
  } else {
    note.push("Ricerca semantica disattivata (CORPUS_EMBEDDINGS=false): solo full-text.");
  }

  // --- Fusione: se si prevede il rerank si pesca un pool ampio da riordinare --
  const useRerank = rerankAbilitato() && chiave;
  const { data, error } = await db().rpc("corpus_hybrid_search", {
    query_text: opts.domanda,
    // pgvector via PostgREST vuole la rappresentazione testuale "[0.1,0.2,…]".
    query_embedding: embedding ? JSON.stringify(embedding) : null,
    match_count: useRerank ? Math.max(POOL_RERANK, limite) : limite,
    filtro_fonte: opts.fonte ?? null,
    filtro_anno: opts.annoImposta ?? null,
  });
  if (error) throw new Error(`corpus_hybrid_search: ${error.message}`);
  let risultati = (data as Riga[]).map(aRisultato);

  // --- Rerank: riordina il pool per rilevanza vera e taglia al top-N ---------
  let rerankata = false;
  if (useRerank && risultati.length > 1) {
    try {
      const documenti = risultati.map((r) => testoDaEmbeddare(r.percorso, r.testo));
      const ordine = await rerankaDocumenti(opts.domanda, documenti, limite);
      risultati = applicaRerank(risultati, ordine, limite);
      rerankata = true;
    } catch (err) {
      note.push(
        "Reranking non disponibile (" +
          (err instanceof Error ? err.message.slice(0, 80) : "errore") +
          "): risultati nell'ordine della ricerca ibrida.",
      );
      risultati = risultati.slice(0, limite);
    }
  } else {
    risultati = risultati.slice(0, limite);
  }

  return {
    risultati,
    ibrida: embedding !== null,
    rerankata,
    note,
  };
}

/**
 * I chunk attorno a uno di essi, nello stesso documento (`seq` ± contesto).
 * I chunk servono a TROVARE, le sezioni a LEGGERE: questo è il ponte fra i due.
 */
export async function leggiIntorno(
  chunkId: number,
  contesto = 2,
): Promise<{ documento: Riga; chunks: Riga[] } | null> {
  const { data: centro, error } = await db()
    .from("corpus_chunks")
    .select("id, documento_id, seq")
    .eq("id", chunkId)
    .maybeSingle();
  if (error) throw new Error(`lettura chunk: ${error.message}`);
  if (!centro) return null;

  const { data: documento } = await db()
    .from("corpus_documenti")
    .select("*")
    .eq("id", centro.documento_id)
    .single();

  const { data: chunks, error: errChunks } = await db()
    .from("corpus_chunks")
    .select("id, seq, percorso, testo, pagina_da, pagina_a, anno_imposta, vigenza_da, vigenza_a")
    .eq("documento_id", centro.documento_id)
    .gte("seq", centro.seq - contesto)
    .lte("seq", centro.seq + contesto)
    .order("seq");
  if (errChunks) throw new Error(`lettura contesto: ${errChunks.message}`);

  return { documento: documento as Riga, chunks: (chunks ?? []) as Riga[] };
}

export type EsitoNorma = {
  riferimento: Riferimento;
  /** I chunk dell'articolo, in ordine. Vuoto se la norma non è (ancora) in corpus. */
  articolo: Riga[];
  documento: Riga | null;
  /** Prassi e istruzioni che citano l'articolo — il grafo citazionale al contrario. */
  citanti: Riga[];
};

/**
 * Lookup diretto di un articolo + chi lo cita. La forma canonica del riferimento
 * (`DPR 917/1986, art. 51`) è la chiave: tutte le grafie collassano su di essa
 * (`normalizzaRiferimento`), altrimenti "art. 51 TUIR" e "articolo 51 del Testo
 * unico" sarebbero due nodi diversi dello stesso grafo.
 */
export async function cercaNorma(grezzo: string): Promise<EsitoNorma | null> {
  const riferimento = normalizzaRiferimento(grezzo);
  if (!riferimento) return null;

  const estremiAtto = `${riferimento.sigla} ${riferimento.numero}/${riferimento.anno}`;
  const { data: documento } = await db()
    .from("corpus_documenti")
    .select("*")
    .eq("fonte", "normattiva")
    .eq("estremi", estremiAtto)
    .maybeSingle();

  let articolo: Riga[] = [];
  if (documento && riferimento.articolo) {
    // Il percorso dei chunk Normattiva finisce con "Art. 51 — rubrica".
    const { data } = await db()
      .from("corpus_chunks")
      .select("id, seq, percorso, testo, vigenza_da, vigenza_a")
      .eq("documento_id", documento.id)
      .or(
        `percorso.ilike.%> Art. ${riferimento.articolo} —%,percorso.ilike.%> Art. ${riferimento.articolo}`,
      )
      .order("seq");
    articolo = (data ?? []) as Riga[];
  }

  // Reverse-lookup sul grafo: chi cita questo articolo (a prescindere dal comma).
  const chiave = chiaveArticolo(riferimento);
  const { data: citazioni } = await db()
    .from("corpus_citazioni")
    .select(
      "riferimento, testo_grezzo, approvata, chunk:corpus_chunks!inner(id, percorso, documento:corpus_documenti!inner(estremi, fonte, tipo, url_origine, data_pubblicazione))",
    )
    .like("riferimento", `${chiave}%`)
    .eq("approvata", true)
    .limit(20);

  const citanti = ((citazioni ?? []) as Riga[]).filter(
    (c) => c.chunk?.documento?.fonte !== "normattiva",
  );

  return {
    riferimento,
    articolo,
    documento: (documento as Riga | null) ?? null,
    citanti,
  };
}

/** Elenco dei documenti in corpus, raggruppabile per fonte/anno. */
export async function documentiIndice(opts: {
  fonte?: Fonte;
  anno?: number;
}): Promise<Riga[]> {
  let q = db()
    .from("corpus_documenti")
    .select("fonte, tipo, estremi, titolo, anno_imposta, data_pubblicazione, url_origine, verificato_il")
    .order("fonte")
    .order("data_pubblicazione", { ascending: false, nullsFirst: false })
    .limit(200);
  if (opts.fonte) q = q.eq("fonte", opts.fonte);
  if (opts.anno) q = q.eq("anno_imposta", opts.anno);

  const { data, error } = await q;
  if (error) throw new Error(`indice documenti: ${error.message}`);
  return (data ?? []) as Riga[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */
