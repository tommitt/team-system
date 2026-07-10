/**
 * Stato dell'ingestione del corpus in prod (ADR 0014). Read-only.
 *   npx tsx scripts/ingest/status.mts
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CODE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function dbUrl(): string {
  const riga = readFileSync(join(CODE_ROOT, ".env.prod"), "utf8")
    .split("\n")
    .find((l: string) => l.startsWith("DATABASE_URL="));
  if (!riga) throw new Error(".env.prod: DATABASE_URL assente");
  return riga.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

function manifestCount(file: string, key: string): number {
  const j = JSON.parse(readFileSync(join(CODE_ROOT, "scripts/ingest/manifests", file), "utf8"));
  return (j[key] ?? []).length;
}

async function main(): Promise<void> {
  const c = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = (sql: string, p: unknown[] = []) => c.query(sql, p).then((r) => r.rows);

  // 1. INGESTIONE — documenti per fonte, vs manifest
  const docs = await q(
    `select fonte, count(*)::int n, min(anno_imposta) anno_min, max(anno_imposta) anno_max
       from corpus_documenti group by fonte order by fonte`,
  );
  const prassiPerAnno = await q(
    `select anno_imposta, count(*)::int n from corpus_documenti
      where fonte='prassi_ade' group by anno_imposta order by anno_imposta`,
  );
  const runs = await q(
    `select fonte, esito, count(*)::int n, max(iniziata_il) ultima
       from corpus_ingestion_runs group by fonte, esito order by fonte, esito`,
  );

  // 2. EMBEDDING — chunk totali vs senza embedding
  const [chunkTot] = await q(`select count(*)::int n from corpus_chunks`);
  const [chunkNoEmb] = await q(`select count(*)::int n from corpus_chunks where embedding is null`);
  const noEmbPerFonte = await q(
    `select d.fonte, count(*)::int n from corpus_chunks ch
       join corpus_documenti d on d.id=ch.documento_id
      where ch.embedding is null group by d.fonte order by d.fonte`,
  );

  // 3. ARRICCHIMENTO — citazioni LLM da approvare + chunk candidati non ancora arricchiti
  const [citTot] = await q(`select count(*)::int n from corpus_citazioni`);
  const citPerMetodo = await q(
    `select metodo, approvata, count(*)::int n from corpus_citazioni
      group by metodo, approvata order by metodo, approvata`,
  );
  const [pendingLlm] = await q(
    `select count(*)::int n from corpus_citazioni where metodo='llm' and not approvata`,
  );
  // Candidati non ancora toccati dall'LLM: stessa query di prep-candidates.mts
  const [candidati] = await q(
    `select count(*)::int n from corpus_chunks ch
       join corpus_documenti d on d.id=ch.documento_id
      where d.fonte in ('prassi_ade','istruzioni_modelli')
        and ch.testo ~* '\\mart'
        and not exists (select 1 from corpus_citazioni x where x.chunk_id=ch.id and x.metodo='llm')`,
  );

  await c.end();

  const N = manifestCount("normattiva.json", "atti");
  const I = manifestCount("istruzioni-2026.json", "fascicoli");
  const byFonte = Object.fromEntries(docs.map((d) => [d.fonte, d]));

  console.log(JSON.stringify({
    ingestione: {
      documenti_per_fonte: docs,
      normattiva: { manifest: N, ingeriti: byFonte["normattiva"]?.n ?? 0, mancanti: N - (byFonte["normattiva"]?.n ?? 0) },
      istruzioni: { manifest: I, ingeriti: byFonte["istruzioni_modelli"]?.n ?? 0, mancanti: I - (byFonte["istruzioni_modelli"]?.n ?? 0) },
      prassi_per_anno: prassiPerAnno,
      runs,
    },
    embedding: {
      chunk_totali: chunkTot.n,
      senza_embedding: chunkNoEmb.n,
      senza_embedding_per_fonte: noEmbPerFonte,
    },
    arricchimento: {
      citazioni_totali: citTot.n,
      per_metodo_approvazione: citPerMetodo,
      citazioni_llm_da_approvare: pendingLlm.n,
      chunk_candidati_non_arricchiti: candidati.n,
    },
  }, null, 2));

  // Verdetto leggibile: cosa manca e con quale comando si chiude.
  const nManc = N - (byFonte["normattiva"]?.n ?? 0);
  const iManc = I - (byFonte["istruzioni_modelli"]?.n ?? 0);
  const anniPrassi = prassiPerAnno.map((r) => r.anno_imposta).filter((a) => a != null);
  const ok = (b: boolean) => (b ? "✓" : "▸");
  console.log("\n─── VERDETTO ───");
  console.log(`${ok(nManc === 0)} normattiva: ${byFonte["normattiva"]?.n ?? 0}/${N}${nManc ? ` — mancano ${nManc} (npm run ingest:normattiva)` : ""}`);
  console.log(`${ok(iManc === 0)} istruzioni: ${byFonte["istruzioni_modelli"]?.n ?? 0}/${I}${iManc ? ` — mancano ${iManc} (npm run ingest:istruzioni --anno <A>)` : ""}`);
  console.log(`▸ prassi: ${byFonte["prassi_ade"]?.n ?? 0} doc${anniPrassi.length ? ` (anni ${anniPrassi.join(", ")})` : ""} — sorgente aperta 2023→oggi; per un anno mancante: npm run ingest:prassi -- --anno <A>`);
  console.log(`${ok(chunkNoEmb.n === 0)} embedding: ${chunkTot.n - chunkNoEmb.n}/${chunkTot.n}${chunkNoEmb.n ? ` — ${chunkNoEmb.n} da fare (npm run ingest:embed)` : ""}`);
  console.log(`${ok(pendingLlm.n === 0)} citazioni LLM da approvare: ${pendingLlm.n}${pendingLlm.n ? " (npx tsx scripts/enrich/verifica-citazioni.mts)" : ""}`);
  console.log(`▸ arricchimento: ${candidati.n} chunk candidati (coda con citazioni ellittiche non estraibili; skill /arricchisci-citazioni — non arriva mai a 0)`);
}

void main();
