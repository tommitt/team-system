/**
 * Prepara i candidati all'arricchimento via subagent: pesca dal DB prod i chunk
 * di prassi/istruzioni che parlano di articoli e non hanno ancora citazioni LLM,
 * e li spezza in N file di gruppo che i subagent leggeranno.
 *
 *   npx tsx scripts/enrich/prep-candidates.mts <N_gruppi> <cap_totale>
 */
import { Client } from "pg";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

async function main(): Promise<void> {
  const N = Number(process.argv[2] ?? 8);
  const CAP = Number(process.argv[3] ?? 96);
  // `--ids 785,882` mira a chunk specifici (giri di correzione mirati); altrimenti
  // pesca i candidati generici (prassi/istruzioni con articoli, senza citazioni LLM).
  const idxIds = process.argv.indexOf("--ids");
  const idsMirati =
    idxIds >= 0
      ? (process.argv[idxIds + 1] ?? "").split(",").map(Number).filter((n) => Number.isFinite(n))
      : [];

  const c = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = idsMirati.length
    ? await c.query("select id, testo from corpus_chunks where id = any($1) order by id", [idsMirati])
    : await c.query(
        `select ch.id, ch.testo
           from corpus_chunks ch
           join corpus_documenti d on d.id = ch.documento_id
          where d.fonte in ('prassi_ade','istruzioni_modelli')
            and ch.testo ~* '\\mart'
            and not exists (
              select 1 from corpus_citazioni x where x.chunk_id = ch.id and x.metodo = 'llm'
            )
          order by ch.id
          limit $1`,
        [CAP],
      );
  await c.end();

  const dir = join(CODE_ROOT, ".enrich-tmp");
  mkdirSync(dir, { recursive: true });
  const gruppi: { id: number; testo: string }[][] = Array.from({ length: N }, () => []);
  rows.forEach((r: { id: number; testo: string }, i: number) =>
    gruppi[i % N].push({ id: r.id, testo: r.testo }),
  );
  const meta = gruppi.map((g, k) => {
    writeFileSync(join(dir, `group-${k}.json`), JSON.stringify(g));
    return { file: `.enrich-tmp/group-${k}.json`, out: `.enrich-tmp/out-${k}.json`, n: g.length };
  });
  console.log(JSON.stringify({ totale: rows.length, gruppi: meta }, null, 2));
}

void main();
