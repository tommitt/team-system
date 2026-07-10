/**
 * Adapter Normattiva — testi normativi consolidati (ADR 0014).
 *
 * È il primo adapter perché è il più strutturato e perché è il BERSAGLIO del
 * grafo citazionale: prassi e istruzioni citano articoli, e senza gli articoli
 * in corpus quelle citazioni restano archi appesi nel vuoto.
 *
 * Come si arriva al testo (spike del 2026-07-10):
 *   1. il resolver URN `/uri-res/N2Ls?<urn>` restituisce la pagina multivigente
 *      e — cosa che conta — apre la SESSIONE (JSESSIONID + cookie di edge);
 *   2. quella pagina espone il link all'export **Akoma Ntoso**
 *      (`/do/atto/caricaAKN?dataGU=…&codiceRedaz=…&dataVigenza=…`);
 *   3. l'export AKN, scaricato NELLA STESSA SESSIONE, è l'atto intero in XML.
 *
 * Senza cookie il punto 3 risponde `200` con una pagina d'errore HTML: un bug
 * silenzioso travestito da successo. Per questo `estraiAkn` verifica di avere
 * davvero un `<akomaNtoso>` prima di procedere. Il fallback (parsing dell'HTML
 * multivigente) non serve: la pagina inlinea solo l'art. 1, gli altri arrivano
 * via AJAX per articolo.
 *
 * Aggiungere una norma = aggiungere una voce a `manifests/normattiva.json`.
 *
 *   npm run ingest:normattiva -- --limit 1 --dry-run
 */
import * as cheerio from "cheerio";
import { Sessione, hashContenuto } from "./lib/fetch";
import { caricaManifest, type AttoManifest } from "./lib/manifest";
import { costruisciChunks, percorso, type ChunkGrezzo } from "./lib/chunker";
import { apriRun, chiudiRun } from "./lib/db";
import { collegaCitazioniAiDocumenti, upsertDocumento } from "./lib/upsert";
import { eseguiScript, parseArgv } from "./lib/cli";

const BASE = "https://www.normattiva.it";

/** Risolve l'URN, apre la sessione e restituisce la pagina multivigente. */
async function paginaAtto(
  sessione: Sessione,
  urn: string,
): Promise<cheerio.CheerioAPI> {
  const html = await sessione.get(`${BASE}/uri-res/N2Ls?${urn}`, "html");
  return cheerio.load(html.toString("utf8"));
}

/** Estrae l'export AKN dalla pagina e lo scarica nella stessa sessione. */
async function scaricaAkn(
  sessione: Sessione,
  $: cheerio.CheerioAPI,
  estremi: string,
): Promise<string> {
  const href = $('a[href*="caricaAKN"]').attr("href");
  if (!href) {
    throw new Error(
      `${estremi}: nessun link AKN nella pagina — Normattiva ha cambiato markup?`,
    );
  }
  const xml = (await sessione.get(`${BASE}${href}`, "xml")).toString("utf8");
  if (!xml.includes("<akomaNtoso")) {
    throw new Error(
      `${estremi}: l'export AKN non contiene <akomaNtoso> (sessione scaduta?). ` +
        `Svuota .ingest-cache/ e riprova.`,
    );
  }
  return xml;
}

/** "Art. 51." → "51"; "Art. 51-bis." → "51-bis". */
function numeroArticolo(grezzo: string): string {
  return grezzo
    .replace(/^art\.?\s*/i, "")
    .replace(/\.$/, "")
    .trim();
}

/** Ripulisce i marcatori di modifica di Normattiva ("((Capo V" → "Capo V"). */
function ripulisciEtichetta(grezzo: string): string {
  return grezzo.replace(/[()]{2,}/g, "").replace(/\s+/g, " ").trim();
}

/** Numero romano in testa a una stringa ("II ((DETERMINAZIONE…" → "II"). */
function romanoIniziale(testo: string): string | null {
  const m = ripulisciEtichetta(testo).match(/^([IVXLC]+)\b/);
  return m ? m[1] : null;
}

/**
 * Etichetta di un contenitore. Quirk: a volte Normattiva mette la sigla nel
 * `<num>` e il NUMERALE nel `<heading>` (`<num>Capo</num>` +
 * `<heading>II DETERMINAZIONE…</heading>`), producendo un "Capo" nudo. In quel
 * caso il numerale si recupera dalla testa della rubrica.
 */
function etichettaContenitore(num: string, heading: string): string {
  const etichetta = ripulisciEtichetta(num);
  if (etichetta === "" || /\d|[IVXLC]\b/.test(etichetta)) return etichetta;
  const romano = romanoIniziale(heading);
  return romano ? `${etichetta} ${romano}` : etichetta;
}

/**
 * Livello gerarchico di un contenitore dal suo `<num>`. Serve perché nell'AKN di
 * Normattiva i contenitori sono `<chapter>` TUTTI ALLO STESSO LIVELLO: la
 * gerarchia vive solo nel testo del `<num>` ("TITOLO II", "Capo I", "Sezione II").
 * Ricostruirla è l'unico modo di avere un percorso completo invece dell'ultimo
 * segmento.
 */
function livelloContenitore(etichetta: string): number {
  const s = ripulisciEtichetta(etichetta).toLowerCase();
  if (s.startsWith("libro")) return 0;
  if (s.startsWith("parte")) return 1;
  if (s.startsWith("titolo")) return 2;
  if (s.startsWith("capo")) return 3;
  if (s.startsWith("sezione")) return 4;
  return 3; // ignoto: trattalo come un Capo
}

/**
 * Un chunk per articolo, col percorso gerarchico completo. I `<paragraph>` sono
 * i commi: si concatenano numerati, così il chunker — se l'articolo sfora —
 * spezza esattamente al confine di comma.
 */
export function chunksDaAkn(xml: string, estremi: string): ChunkGrezzo[] {
  const $ = cheerio.load(xml, { xml: true });
  const unita: ChunkGrezzo[] = [];

  // Stack dei contenitori aperti, ricostruito scorrendo il documento in ordine.
  let gerarchia: { livello: number; etichetta: string }[] = [];

  $("chapter, section, title, book, part, article").each((_, el) => {
    const $el = $(el);

    if (el.tagName !== "article") {
      const etichetta = etichettaContenitore(
        $el.children("num").first().text(),
        $el.children("heading").first().text(),
      );
      if (etichetta === "") return;
      const livello = livelloContenitore(etichetta);
      gerarchia = gerarchia.filter((g) => g.livello < livello);
      gerarchia.push({ livello, etichetta });
      return;
    }

    const $art = $el;
    const num = numeroArticolo($art.children("num").first().text());
    if (num === "") return;

    // Quirk: negli articoli modificati Normattiva riversa TUTTO il testo dentro
    // `<heading>`, lasciando nei `<paragraph>` solo il marcatore di modifica
    // ("((115))"). La rubrica è allora solo la prima riga; il resto è norma vera
    // e va nel corpo, altrimenti l'articolo entrerebbe in corpus svuotato.
    const headingGrezzo = ripulisciEtichetta($art.children("heading").first().text());
    const [primaRiga] = headingGrezzo.split(/(?<=\.)\s|\n/, 1);
    const rubricaLunga = headingGrezzo.length > 120;
    const rubrica = rubricaLunga ? primaRiga.slice(0, 120).trim() : headingGrezzo;
    const contenitori = gerarchia.map((g) => g.etichetta);

    const commi: string[] = [];
    if (rubricaLunga) commi.push(headingGrezzo);
    $art.find("paragraph").each((_, p) => {
      const $p = $(p);
      const numComma = $p.children("num").first().text().trim();
      const testo = $p
        .find("content")
        .text()
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
      if (testo !== "") commi.push(numComma ? `${numComma} ${testo}` : testo);
    });

    // Articoli senza <paragraph> (abrogati, o con solo <content>): prendi il testo.
    const testo =
      commi.length > 0
        ? commi.join("\n")
        : $art.find("content").text().replace(/[ \t]+/g, " ").trim();
    if (testo === "") return;

    const intestazione = rubrica ? `Art. ${num} — ${rubrica}` : `Art. ${num}`;
    unita.push({
      percorso: percorso(estremi, ...contenitori, intestazione),
      testo,
    });
  });

  return unita;
}

async function main(): Promise<void> {
  const opts = parseArgv();
  const atti = caricaManifest<AttoManifest>("normattiva.json", "atti");
  const daFare = opts.limit ? atti.slice(0, opts.limit) : atti;

  const run = await apriRun("normattiva");
  console.log(`Normattiva — ${daFare.length} atti da manifest\n`);

  try {
    for (const atto of daFare) {
      // Una sessione per atto: il cookie lega la sessione all'atto risolto.
      const sessione = new Sessione();
      const $ = await paginaAtto(sessione, atto.urn);
      const xml = await scaricaAkn(sessione, $, atto.estremi);

      const unita = chunksDaAkn(xml, atto.estremi);
      if (unita.length === 0) {
        throw new Error(`${atto.estremi}: zero articoli estratti dall'AKN`);
      }
      const chunks = costruisciChunks(unita);

      const esito = await upsertDocumento(
        {
          fonte: "normattiva",
          tipo: "norma",
          estremi: atto.estremi,
          titolo: atto.titolo,
          identificativo: atto.identificativo,
          urlOrigine: `${BASE}/uri-res/N2Ls?${atto.urn}`,
          hashContenuto: hashContenuto(xml),
        },
        chunks,
        run,
        { dryRun: opts.dryRun },
      );
      console.log(
        `  ${esito.padEnd(11)} ${atto.estremi} — ${unita.length} articoli, ${chunks.length} chunk`,
      );
    }

    if (!opts.dryRun) {
      const collegate = await collegaCitazioniAiDocumenti();
      console.log(`\nGrafo citazionale: ${collegate} archi chiusi su norme note.`);
    }
    await chiudiRun(run, "ok", {
      cursore: opts.dryRun
        ? undefined
        : { atti: daFare.map((a) => a.identificativo) },
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
