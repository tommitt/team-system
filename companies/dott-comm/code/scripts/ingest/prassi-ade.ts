/**
 * Adapter prassi Agenzia delle Entrate — circolari, risoluzioni, interpelli.
 *
 * È LA fonte per le domande puntuali: è ciò che i Memento sintetizzano.
 * Backfill 2023 → oggi (ADR 0014); backfill più profondo in un secondo giro.
 *
 * Struttura del sito (spike del 2026-07-10):
 *   pagina anno   `/portale/circolari-2023`        → link alle 12 pagine mese
 *   pagina mese   `/portale/luglio-2023-circolari` → un `div.journal-content-article`
 *                                                    per documento, con `<strong>`
 *                                                    (estremi) e un `<a>` al PDF
 *
 * I link mese si RICAVANO dalla pagina anno, non si costruiscono: l'AdE ha
 * refusi nei propri URL (`settembre-2023-intepelli_`), e una regola inventata da
 * noi salterebbe silenziosamente un mese intero. Meglio seguire i link veri.
 *
 *   npm run ingest:prassi -- --anno 2023 --limit 2 --dry-run
 *   npm run ingest:prassi -- --incremental
 */
import * as cheerio from "cheerio";
import { hashContenuto, scaricaConCache, scaricaTesto } from "./lib/fetch";
import { estraiPagine, paginaDiOffset, unisciPagine } from "./lib/pdf";
import {
  costruisciChunks,
  mascheraIndice,
  percorso,
  ripulisciTestoPdf,
  type ChunkGrezzo,
} from "./lib/chunker";
import { apriRun, chiudiRun, ultimoCursore, type TipoDocumento } from "./lib/db";
import { collegaCitazioniAiDocumenti, upsertDocumento } from "./lib/upsert";
import { eseguiScript, parseArgv } from "./lib/cli";

const BASE = "https://www.agenziaentrate.gov.it/portale";
const PRIMO_ANNO = 2023; // ADR 0014: backfill 2023 → oggi

/** I tre rami della prassi, con la loro pagina-anno e il tipo in corpus. */
const RAMI = [
  { slug: "circolari", tipo: "circolare" as TipoDocumento, etichetta: "Circolare" },
  { slug: "risoluzioni", tipo: "risoluzione" as TipoDocumento, etichetta: "Risoluzione" },
  { slug: "interpelli", tipo: "interpello" as TipoDocumento, etichetta: "Risposta" },
] as const;

type Ramo = (typeof RAMI)[number];

type Documento = {
  numero: string;
  data: string; // YYYY-MM-DD
  estremi: string;
  titolo: string;
  urlPdf: string;
};

const MESI_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/**
 * Link alle pagine-mese, presi dalla pagina-anno (mai costruiti a mano: vedi il
 * refuso `settembre-2023-intepelli_`). Si accetta qualunque URL che sia
 * `<mese>-<anno>-<qualcosa>`: il "qualcosa" lo si è già scelto chiedendo la
 * pagina-anno del ramo giusto, quindi non serve rivalidarlo (ed è proprio lì
 * che l'AdE sbaglia a scrivere).
 */
async function paginaMese(ramo: Ramo, anno: number): Promise<string[]> {
  const html = await scaricaTesto(`${BASE}/${ramo.slug}-${anno}`);
  const $ = cheerio.load(html);
  const atteso = new RegExp(`/portale/(?:${MESI_IT.join("|")})-${anno}-[a-z_]+$`);

  const mesi = new Set<string>();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href")!;
    const assoluto = href.startsWith("http")
      ? href
      : `https://www.agenziaentrate.gov.it${href}`;
    if (atteso.test(assoluto)) mesi.add(assoluto);
  });

  if (mesi.size === 0) {
    console.warn(`  ⚠️ ${ramo.slug} ${anno}: nessuna pagina mese trovata`);
  }
  return [...mesi].sort();
}

const RE_ESTREMI = /n[°.]?\s*(\d+)\s*(?:\/E)?\s+del\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i;

/** Un `div.journal-content-article` per documento: estremi in `<strong>`, PDF nell'`<a>`. */
export function documentiDaPaginaMese(html: string, ramo: Ramo): Documento[] {
  const $ = cheerio.load(html);
  const out: Documento[] = [];

  $("div.journal-content-article").each((_, blocco) => {
    const $b = $(blocco);
    const strong = $b.find("strong").first().text().trim();
    const m = strong.match(RE_ESTREMI);
    const $a = $b.find('a[href*=".pdf"]').first();
    if (!m || $a.length === 0) return;

    const [, numero, gg, mm, aaaa] = m;
    const data = `${aaaa}-${mm.padStart(2, "0")}-${gg.padStart(2, "0")}`;
    // Il `?t=…` è un cache-buster: toglierlo rende stabile la chiave di cache.
    const urlPdf = $a.attr("href")!.split("?")[0];

    out.push({
      numero,
      data,
      estremi: `${ramo.etichetta} ${numero}/E del ${gg.padStart(2, "0")}/${mm.padStart(2, "0")}/${aaaa}`,
      titolo: $a.text().replace(/\s+/g, " ").trim(),
      urlPdf: urlPdf.startsWith("http")
        ? urlPdf
        : `https://www.agenziaentrate.gov.it${urlPdf}`,
    });
  });

  return out;
}

/**
 * Titoli di sezione della prassi AdE: "3." / "3.2" / "3.2.1" a inizio riga,
 * seguiti dalla rubrica. È la struttura che rende citabile un "§ 3.2".
 *
 * Il punto dopo il numero (o la sotto-numerazione) è OBBLIGATORIO: senza di
 * esso "3 PREMESSA" — cioè il numero di pagina in fondo a una pagina, seguito
 * dal titolo che apre la successiva — passerebbe per una sezione. I titoli veri
 * dell'AdE hanno sempre "1." oppure "1.1".
 */
const RE_SEZIONE =
  /^[ \t]*(\d+\.\d+(?:\.\d+)?|\d+\.)[ \t]+(\p{Lu}(?:(?!\.{3})[^\n]){3,120})$/gmu;

/**
 * Chunk per sezione numerata, con le pagine di provenienza. Se il PDF non ha
 * sezioni numerate (le risposte a interpello spesso non le hanno) si ripiega su
 * un unico blocco: il chunker lo spezzerà ai capoversi.
 */
export function chunksDaPdf(
  testoPaginato: ReturnType<typeof unisciPagine>,
  percorsoBase: string,
): ChunkGrezzo[] {
  // `mascheraIndice` conserva la lunghezza del testo: gli offset restano validi
  // per la mappa delle pagine.
  const testo = mascheraIndice(testoPaginato.testo);
  const tagli: { offset: number; titolo: string }[] = [];

  RE_SEZIONE.lastIndex = 0;
  for (let m = RE_SEZIONE.exec(testo); m; m = RE_SEZIONE.exec(testo)) {
    const numero = m[1].replace(/\.$/, "");
    tagli.push({ offset: m.index, titolo: `${numero} ${m[2].trim()}` });
  }

  if (tagli.length === 0) {
    return [
      {
        percorso: percorsoBase,
        testo: ripulisciTestoPdf(testo),
        paginaDa: 1,
        paginaA: testoPaginato.offsets.length,
      },
    ];
  }

  const unita: ChunkGrezzo[] = [];
  // Il preambolo (prima della sezione 1) contiene oggetto e riferimenti: si tiene.
  if (tagli[0].offset > 200) {
    unita.push({
      percorso: percorso(percorsoBase, "Premessa"),
      testo: ripulisciTestoPdf(testo.slice(0, tagli[0].offset)),
      paginaDa: 1,
      paginaA: paginaDiOffset(testoPaginato, tagli[0].offset),
    });
  }

  for (let i = 0; i < tagli.length; i++) {
    const inizio = tagli[i].offset;
    const fine = i + 1 < tagli.length ? tagli[i + 1].offset : testo.length;
    const corpo = ripulisciTestoPdf(testo.slice(inizio, fine));
    if (corpo === "") continue;
    unita.push({
      percorso: percorso(percorsoBase, tagli[i].titolo),
      testo: corpo,
      paginaDa: paginaDiOffset(testoPaginato, inizio),
      paginaA: paginaDiOffset(testoPaginato, Math.max(inizio, fine - 1)),
    });
  }
  return unita;
}

async function main(): Promise<void> {
  const opts = parseArgv();
  const annoCorrente = new Date().getFullYear();

  const cursore = opts.incremental ? await ultimoCursore("prassi_ade") : null;
  const daAnno = opts.anno ?? (cursore?.ultimo_anno as number | undefined) ?? PRIMO_ANNO;
  const aAnno = opts.anno ?? annoCorrente;

  const run = await apriRun("prassi_ade");
  console.log(`Prassi AdE — anni ${daAnno}→${aAnno}${opts.limit ? `, max ${opts.limit} doc` : ""}\n`);

  let elaborati = 0;
  try {
    for (const ramo of RAMI) {
      for (let anno = daAnno; anno <= aAnno; anno++) {
        const mesi = await paginaMese(ramo, anno);
        console.log(`${ramo.slug} ${anno}: ${mesi.length} pagine mese`);

        for (const urlMese of mesi) {
          if (opts.limit && elaborati >= opts.limit) break;
          const html = await scaricaTesto(urlMese);
          const documenti = documentiDaPaginaMese(html, ramo);

          for (const doc of documenti) {
            if (opts.limit && elaborati >= opts.limit) break;
            elaborati++;

            const pdf = await scaricaConCache(doc.urlPdf, "pdf");
            const pagine = await estraiPagine(pdf);
            const testoPaginato = unisciPagine(pagine);
            const unita = chunksDaPdf(testoPaginato, doc.estremi);
            const chunks = costruisciChunks(unita);

            const esito = await upsertDocumento(
              {
                fonte: "prassi_ade",
                tipo: ramo.tipo,
                estremi: doc.estremi,
                titolo: doc.titolo,
                identificativo: `ade:${ramo.tipo}:${anno}:${doc.numero}`,
                urlOrigine: doc.urlPdf,
                dataPubblicazione: doc.data,
                hashContenuto: hashContenuto(pdf),
              },
              chunks,
              run,
              { dryRun: opts.dryRun },
            );
            console.log(
              `  ${esito.padEnd(11)} ${doc.estremi} — ${pagine.length} pp, ${chunks.length} chunk`,
            );
          }
        }
      }
    }

    // Gli archi verso le norme già in corpus si chiudono ora: la prassi cita, la
    // norma è citata. È idempotente, quindi si rilancia a ogni ingestione.
    if (!opts.dryRun) {
      const collegate = await collegaCitazioniAiDocumenti();
      console.log(`\nGrafo citazionale: ${collegate} archi chiusi su norme note.`);
    }
    await chiudiRun(run, "ok", {
      cursore: opts.dryRun ? undefined : { ultimo_anno: aAnno },
      note: opts.dryRun ? "dry-run: nessuna scrittura" : undefined,
    });
    console.log(
      `\n✓ visti ${run.visti} · nuovi ${run.nuovi} · aggiornati ${run.aggiornati} · chunk ${run.chunk}`,
    );
  } catch (err) {
    await chiudiRun(run, "errore", {
      note: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

void eseguiScript(main);
