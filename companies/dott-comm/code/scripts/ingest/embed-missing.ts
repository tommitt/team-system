/**
 * Riempie gli embedding mancanti (ADR 0014 §4).
 *
 * Disaccoppiato dal parsing di proposito: un rate-limit o un outage di Cohere
 * non deve far fallire un'ingestione. Gli adapter scrivono i chunk con
 * `embedding is null`; questo script li raccoglie e li completa, quante volte
 * serve. È quindi ripartibile: interrompilo e rilancialo, riprende da dove era.
 *
 *   npm run ingest:embed -- --limit 500
 */
import {
  DIMENSIONI,
  embedTesti,
  testoDaEmbeddare,
} from "../../src/lib/corpus/embeddings";
import { getDb } from "./lib/db";
import { eseguiScript, parseArgv } from "./lib/cli";

/** Cohere accetta fino a 96 testi per chiamata; si sta larghi. */
const LOTTO = 64;
const TENTATIVI = 6;
/** Attesa sui 429: il rate limit di Cohere è per MINUTO, quindi si aspetta il minuto. */
const ATTESA_RATE_LIMIT_MS = 65_000;
/** Passo fra i lotti per stare sotto il rate limit token/minuto (chiavi trial). */
const PASSO_LOTTO_MS = Number(process.env.EMBED_PASSO_MS ?? 20_000);

type ChunkDaEmbeddare = { id: number; percorso: string; testo: string };

function eRateLimit(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return m.includes("429") || /rate limit/i.test(m);
}

/** Tetto alle attese per rate limit: oltre, è probabile un cap esaurito, non cadenza. */
const MAX_ATTESE_RATE_LIMIT = 30;

async function conRetry<T>(fn: () => Promise<T>, etichetta: string): Promise<T> {
  let ultimo: unknown;
  let atteseRate = 0;
  for (let i = 0; i < TENTATIVI; ) {
    try {
      return await fn();
    } catch (err) {
      ultimo = err;
      // Il rate limit è per minuto: un backoff esponenziale corto (12s) non
      // basta a superarlo. Si aspetta il reset del minuto e NON si consuma un
      // tentativo (il 429 non è colpa nostra, è cadenza) — con un tetto, così
      // una chiave col cap mensile esaurito non manda in loop infinito.
      if (eRateLimit(err) && atteseRate < MAX_ATTESE_RATE_LIMIT) {
        atteseRate++;
        console.warn(
          `  ⏳ ${etichetta}: rate limit — attendo ${ATTESA_RATE_LIMIT_MS / 1000}s (${atteseRate}/${MAX_ATTESE_RATE_LIMIT})`,
        );
        await new Promise((r) => setTimeout(r, ATTESA_RATE_LIMIT_MS));
        continue;
      }
      i++;
      const attesa = 2 ** i * 1500;
      console.warn(`  ↻ ${etichetta}: retry ${i}/${TENTATIVI} tra ${attesa}ms`);
      await new Promise((r) => setTimeout(r, attesa));
    }
  }
  throw ultimo;
}

async function main(): Promise<void> {
  const opts = parseArgv();
  const db = getDb();

  const { count } = await db
    .from("corpus_chunks")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);
  console.log(`Chunk senza embedding: ${count ?? 0}`);
  if (!count) return;

  const massimo = opts.limit ?? count;
  let fatti = 0;

  while (fatti < massimo) {
    const { data, error } = await db
      .from("corpus_chunks")
      .select("id, percorso, testo")
      .is("embedding", null)
      .order("id")
      .limit(Math.min(LOTTO, massimo - fatti));
    if (error) throw new Error(`lettura chunk: ${error.message}`);
    if (!data || data.length === 0) break;

    const chunks = data as ChunkDaEmbeddare[];
    const testi = chunks.map((c) => testoDaEmbeddare(c.percorso, c.testo));

    if (opts.dryRun) {
      console.log(`  [dry-run] embedderei ${chunks.length} chunk (${DIMENSIONI}d)`);
      console.log(`    es. "${testi[0].slice(0, 120).replace(/\n/g, " ⟩ ")}…"`);
      return;
    }

    const vettori = await conRetry(
      () => embedTesti(testi, "search_document"),
      `lotto da ${chunks.length}`,
    );

    // Un update per chunk: PostgREST non fa update multi-riga con valori diversi
    // senza un upsert, e un upsert su `corpus_chunks` richiederebbe di rispedire
    // ogni colonna (incluse le generate). Sono ~poche migliaia di righe una tantum.
    for (let i = 0; i < chunks.length; i++) {
      const { error: errUp } = await db
        .from("corpus_chunks")
        .update({ embedding: JSON.stringify(vettori[i]) })
        .eq("id", chunks[i].id);
      if (errUp) throw new Error(`update embedding ${chunks[i].id}: ${errUp.message}`);
    }

    fatti += chunks.length;
    console.log(`  ${fatti}/${massimo} chunk embeddati`);

    // Passo costante fra i lotti: tiene il carico sotto il rate limit per-minuto
    // dei token (rilevante sulle chiavi trial ~100k/min) invece di rimbalzare
    // sui 429. Trascurabile sulle chiavi di produzione.
    if (fatti < massimo) await new Promise((r) => setTimeout(r, PASSO_LOTTO_MS));
  }

  console.log(`\n✓ ${fatti} embedding scritti`);
}

void eseguiScript(main);
