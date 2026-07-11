/**
 * Verifica e sign-off delle citazioni LLM — l'ULTIMO passo della skill
 * `/arricchisci-citazioni`. Sostituisce la vecchia pipeline separata di
 * sign-off: la verifica automatica (grounding) + la revisione dell'agente sono
 * il gate, in un solo posto, così non c'è una seconda pipeline che può driftare.
 *
 * Il grounding è il segnale forte: una citazione è confermata se il NUMERO e
 * l'ANNO dell'atto compaiono nel testo del chunk (o l'atto è citato per alias
 * noto — "TUIR", "statuto del contribuente"). Le regex sono già approvate a
 * monte e NON si toccano qui.
 *
 *   npx tsx scripts/enrich/verifica-citazioni.mts                 # report
 *   npx tsx scripts/enrich/verifica-citazioni.mts --approva-grounded
 *   npx tsx scripts/enrich/verifica-citazioni.mts --approva 12,15,18
 *   npx tsx scripts/enrich/verifica-citazioni.mts --rigetta 20,21
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CODE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function dbUrl(): string {
  const riga = readFileSync(join(CODE_ROOT, ".env.prod"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!riga) throw new Error(".env.prod: DATABASE_URL assente");
  return riga.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

type Pending = { id: number; riferimento: string; chunk_id: number; quote: string };

/**
 * Grounding sulla QUOTE (il `testo_grezzo`, già verificato verbatim nel chunk a
 * monte da write-citazioni). Qui si controlla che la quote NOMINI davvero l'atto
 * del riferimento — l'ultima difesa contro la misattribuzione (quote reale, ma
 * associata all'atto sbagliato):
 *  - numero + anno (a 4 o 2 cifre) dell'atto nella quote; oppure
 *  - un alias noto (TUIR → DPR 917/1986; statuto → L. 212/2000).
 * Ritorna `null` se confermata, altrimenti il motivo del dubbio.
 */
function motivoDubbio(rif: string, quote: string): string | null {
  const q = (quote ?? "").toLowerCase();
  const m = rif.match(/(\d{1,4})\/(\d{4})/);
  if (m) {
    const [, num, anno] = m;
    if (q.includes(num) && (q.includes(anno) || q.includes(anno.slice(2)))) return null;
    if (rif.startsWith("DPR 917/1986") && /\btuir\b|testo unico/.test(q)) return null;
    if (rif.startsWith("L. 212/2000") && /statuto/.test(q)) return null;
    return `l'atto ${num}/${anno} non è nominato nella quote`;
  }
  return "atto non parsabile";
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const idsDi = (flag: string): number[] => {
    const i = argv.indexOf(flag);
    if (i < 0) return [];
    return (argv[i + 1] ?? "").split(",").map(Number).filter((n) => Number.isFinite(n));
  };

  const c = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Mutazioni: solo su metodo='llm' e non ancora approvate (mai regex/approvate).
  if (argv.includes("--approva") || argv.includes("--rigetta")) {
    const app = idsDi("--approva");
    const rig = idsDi("--rigetta");
    if (app.length) {
      const r = await c.query(
        "update corpus_citazioni set approvata=true where metodo='llm' and not approvata and id = any($1)",
        [app],
      );
      console.log(`approvate: ${r.rowCount}`);
    }
    if (rig.length) {
      const r = await c.query(
        "delete from corpus_citazioni where metodo='llm' and not approvata and id = any($1)",
        [rig],
      );
      console.log(`rigettate (eliminate): ${r.rowCount}`);
    }
    await c.end();
    return;
  }

  const { rows } = await c.query(
    `select c.id, c.riferimento, c.chunk_id, coalesce(c.testo_grezzo,'') as quote
       from corpus_citazioni c
      where c.metodo = 'llm' and not c.approvata
      order by c.chunk_id, c.id`,
  );
  const pending = rows as Pending[];
  const grounded = pending.filter((p) => motivoDubbio(p.riferimento, p.quote) === null);
  const dubbi = pending.filter((p) => motivoDubbio(p.riferimento, p.quote) !== null);

  if (argv.includes("--approva-grounded")) {
    const ids = grounded.map((p) => p.id);
    if (ids.length) {
      const r = await c.query(
        "update corpus_citazioni set approvata=true where metodo='llm' and not approvata and id = any($1)",
        [ids],
      );
      console.log(`approvate (auto-grounded): ${r.rowCount}`);
    } else {
      console.log("nessuna citazione auto-grounded da approvare");
    }
    console.log(`restano da rivedere a mano: ${dubbi.length}`);
    await c.end();
    return;
  }

  // Report di default.
  console.log(`PENDING LLM: ${pending.length}`);
  console.log(`  auto-grounded (l'atto è nominato nella quote verbatim): ${grounded.length}`);
  console.log(`  da rivedere (quote reale ma atto non nominato → possibile misattribuzione): ${dubbi.length}`);
  if (dubbi.length) {
    console.log("\n--- DA RIVEDERE (id · riferimento · chunk · quote) ---");
    for (const p of dubbi) {
      console.log(`  ${p.id} · ${p.riferimento} · chunk ${p.chunk_id}`);
      console.log(`     "${p.quote}"`);
    }
    console.log(
      "\nProssimo passo: `--approva-grounded` per le confermate; poi leggi i chunk dei dubbi " +
        "e `--approva <ids>` / `--rigetta <ids>`.",
    );
  } else if (pending.length) {
    console.log("\nTutte auto-grounded → `--approva-grounded`.");
  }
  await c.end();
}

void main();
