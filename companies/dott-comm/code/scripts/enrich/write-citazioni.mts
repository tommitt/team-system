/**
 * Persiste le citazioni estratte da un subagent (skill /arricchisci-citazioni,
 * fan-out sotto l'auth della sessione — niente Batch API né chiave tier-1).
 * Input: `[{chunk_id, atto, articolo?, comma?, quote}]`.
 *
 * GATE ANTI-ALLUCINAZIONE: ogni citazione DEVE portare `quote`, la porzione
 * VERBATIM del chunk dove l'atto compare. Se la quote non è davvero una
 * sottostringa del testo del chunk, la citazione si scarta QUI, a monte: un
 * modello non può inventare un atto senza inventare anche una quote inesistente,
 * e quella non supera il controllo. È la lezione dei 28 rigetti del primo giro
 * (leggi cinema attribuite a una tabella start-up): il modello riempiva con la
 * sua conoscenza, non col testo.
 *
 * Normalizzazione (forma canonica + URN) e dedup restano deterministici nel
 * codice; la `quote` diventa il `testo_grezzo` (così la verifica successiva è
 * esatta, non euristica). Sempre `metodo='llm', approvata=false`.
 *
 *   npx tsx scripts/enrich/write-citazioni.mts .enrich-tmp/out-3.json
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizzaRiferimento } from "../../src/lib/parse/riferimenti-norma";

const CODE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function dbUrl(): string {
  const riga = readFileSync(join(CODE_ROOT, ".env.prod"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!riga) throw new Error(".env.prod: DATABASE_URL assente");
  return riga.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

/**
 * Confronto robusto per il match verbatim: minuscolo, apostrofi/virgolette
 * unificati, e — cruciale sui PDF — TUTTI gli spazi unicode (NBSP, en/em space,
 * thin space…) collassati a uno. Senza questo, una quote copiata correttamente
 * verrebbe scartata solo perché il PDF ha uno spazio insecabile invece di uno
 * normale. Non indebolisce il gate: le PAROLE (numero d'atto, testo) devono
 * comunque comparire in sequenza; cambia solo la tolleranza sugli spazi.
 */
function normWS(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u2032\u0060]/g, "'") // apostrofi/prime → '
    // Tutti gli spazi unicode (NBSP, en/em/thin space, ZWSP, ideographic, BOM…) → uno.
    .replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]+/g, " ")
    .trim();
}

type Estratta = {
  chunk_id: number;
  atto: string;
  articolo?: string;
  comma?: string;
  quote?: string;
};

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) throw new Error("uso: write-citazioni.mts <file.json>");
  const grezze = JSON.parse(readFileSync(join(CODE_ROOT, file), "utf8")) as Estratta[];

  const c = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Testi dei chunk citati, per il controllo verbatim della quote.
  const ids = [...new Set(grezze.map((e) => Number(e.chunk_id)).filter(Boolean))];
  const testi = new Map<number, string>();
  if (ids.length) {
    const { rows } = await c.query("select id, testo from corpus_chunks where id = any($1)", [ids]);
    // node-pg restituisce i bigint come STRINGA: forza la chiave a numero per far
    // combaciare `chunk_id` (numero dal JSON del subagent).
    for (const r of rows) testi.set(Number(r.id), normWS(r.testo));
  }

  let inserite = 0;
  let senzaQuote = 0;
  let quoteAssente = 0; // quote non trovata nel testo → probabile allucinazione
  let nonParsabile = 0;
  let duplicate = 0;

  for (const e of grezze) {
    const chunkId = Number(e.chunk_id);
    if (!chunkId) continue;
    const quote = (e.quote ?? "").trim();
    if (quote === "") {
      senzaQuote++;
      continue; // contratto: senza quote non si scrive
    }
    const testo = testi.get(chunkId);
    if (!testo || !testo.includes(normWS(quote))) {
      quoteAssente++; // la quote NON è nel chunk → scartata a monte
      continue;
    }

    const testoRif = [
      e.atto,
      e.articolo ? `art. ${e.articolo}` : null,
      e.comma ? `c. ${e.comma}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const norm = normalizzaRiferimento(testoRif);
    if (!norm) {
      nonParsabile++;
      continue; // atto non riconosciuto → scartato, mai inventato
    }

    const gia = await c.query(
      "select 1 from corpus_citazioni where chunk_id=$1 and riferimento=$2 limit 1",
      [chunkId, norm.riferimento],
    );
    if (gia.rowCount) {
      duplicate++;
      continue;
    }
    await c.query(
      "insert into corpus_citazioni (chunk_id, riferimento, urn, testo_grezzo, metodo, approvata) " +
        "values ($1,$2,$3,$4,'llm',false)",
      [chunkId, norm.riferimento, norm.urn, quote.slice(0, 400)],
    );
    inserite++;
  }
  await c.end();
  console.log(
    `write-citazioni(${file}): ${inserite} inserite · scartate → ` +
      `quote assente ${senzaQuote}, quote non-nel-testo ${quoteAssente}, ` +
      `atto non parsabile ${nonParsabile}, duplicate ${duplicate}`,
  );
}

void main();
