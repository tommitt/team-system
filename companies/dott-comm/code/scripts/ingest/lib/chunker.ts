/**
 * Chunking strutturale (ADR 0014).
 *
 * Il chunk è l'unità di RICERCA, non di lettura: si taglia ai confini semantici
 * che la fonte già espone (un articolo, una sezione numerata, un gruppo di
 * righi), e solo se il pezzo sfora si spezza — ai confini dei commi, mai a metà
 * frase. Ogni chunk porta il `percorso` gerarchico completo, che finisce sia nel
 * tsvector sia nell'embedding (contextual retrieval).
 *
 * Funzioni pure e testabili: nessun I/O qui dentro.
 */

/** ~4 caratteri per token sull'italiano: stima grossolana ma stabile. */
const CARATTERI_PER_TOKEN = 4;
export const MAX_TOKEN = 1000;
export const MIN_TOKEN = 60;

export function stimaToken(testo: string): number {
  return Math.ceil(testo.length / CARATTERI_PER_TOKEN);
}

export type ChunkGrezzo = {
  percorso: string;
  testo: string;
  paginaDa?: number;
  paginaA?: number;
};

export type Chunk = ChunkGrezzo & { seq: number };

/**
 * Spezza un testo troppo lungo ai confini dei commi ("1.", "2." a inizio riga,
 * o "comma 2"), poi ai capoversi, poi — solo come ultima risorsa — alle frasi.
 * Non taglia mai a metà parola.
 */
export function spezzaTestoLungo(testo: string, maxToken = MAX_TOKEN): string[] {
  if (stimaToken(testo) <= maxToken) return [testo];

  for (const separatore of [
    /\n(?=\s*\d+[.)]\s)/, // "1. " a inizio riga: comma numerato
    /\n(?=\s*[a-z][.)]\s)/, // "a) ": lettera
    /\n\s*\n/, // capoverso
    /(?<=\.)\s+(?=[A-ZÀÈÉÌÒÙ])/, // fine frase
  ]) {
    const pezzi = testo.split(separatore).filter((p) => p.trim() !== "");
    if (pezzi.length < 2) continue;
    return ricomponi(pezzi, maxToken);
  }

  // Nessun confine utile: taglio duro ai confini di parola.
  return tagliaAParole(testo, maxToken);
}

/**
 * Riaccorpa i pezzi in blocchi ≤ maxToken. Un pezzo singolo ancora troppo lungo
 * viene ricorsivamente rispezzato: senza questo, un comma monolitico sfonderebbe
 * il limite in silenzio.
 */
function ricomponi(pezzi: string[], maxToken: number): string[] {
  const out: string[] = [];
  let corrente = "";
  for (const pezzo of pezzi) {
    if (stimaToken(pezzo) > maxToken) {
      if (corrente.trim() !== "") out.push(corrente.trim());
      corrente = "";
      out.push(...tagliaAParole(pezzo, maxToken));
      continue;
    }
    const candidato = corrente === "" ? pezzo : `${corrente}\n${pezzo}`;
    if (stimaToken(candidato) > maxToken && corrente !== "") {
      out.push(corrente.trim());
      corrente = pezzo;
    } else {
      corrente = candidato;
    }
  }
  if (corrente.trim() !== "") out.push(corrente.trim());
  return out;
}

function tagliaAParole(testo: string, maxToken: number): string[] {
  const maxCaratteri = maxToken * CARATTERI_PER_TOKEN;
  const parole = testo.split(/\s+/);
  const out: string[] = [];
  let corrente = "";
  for (const parola of parole) {
    const candidato = corrente === "" ? parola : `${corrente} ${parola}`;
    if (candidato.length > maxCaratteri && corrente !== "") {
      out.push(corrente);
      corrente = parola;
    } else {
      corrente = candidato;
    }
  }
  if (corrente.trim() !== "") out.push(corrente.trim());
  return out;
}

/**
 * Da unità semantiche (articoli, sezioni) a chunk numerati: spezza i lunghi,
 * scarta i vuoti, e accorpa i frammenti troppo corti al chunk precedente dello
 * STESSO percorso (una rubrica di due parole non è un risultato di ricerca).
 */
export function costruisciChunks(
  unita: ChunkGrezzo[],
  opts: { maxToken?: number; minToken?: number } = {},
): Chunk[] {
  const maxToken = opts.maxToken ?? MAX_TOKEN;
  const minToken = opts.minToken ?? MIN_TOKEN;
  const out: Chunk[] = [];

  for (const u of unita) {
    const testo = u.testo.trim();
    if (testo === "") continue;

    for (const pezzo of spezzaTestoLungo(testo, maxToken)) {
      const precedente = out[out.length - 1];
      const accorpabile =
        precedente !== undefined &&
        precedente.percorso === u.percorso &&
        stimaToken(pezzo) < minToken &&
        stimaToken(precedente.testo) + stimaToken(pezzo) <= maxToken;

      if (accorpabile) {
        precedente.testo = `${precedente.testo}\n${pezzo}`;
        precedente.paginaA = u.paginaA ?? precedente.paginaA;
        continue;
      }
      out.push({ ...u, testo: pezzo, seq: out.length });
    }
  }
  return out;
}

/** Percorso gerarchico leggibile: i segmenti vuoti spariscono. */
export function percorso(...segmenti: (string | undefined | null)[]): string {
  return segmenti
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s !== "")
    .join(" > ");
}

/**
 * Righe dell'indice: rubrica + puntini di guida + numero di pagina
 * ("1.1 Ambito oggettivo ......... 4"). Vanno tolte prima di chunkare, altrimenti
 * l'indice di una circolare entra in corpus come se fosse il suo contenuto — e
 * una ricerca su "ambito oggettivo" restituisce una riga di sommario invece
 * della norma.
 */
export const RE_RIGA_INDICE = /^[^\n]*\.{4,}[^\n]*\d+[ \t]*$/gm;

export function rimuoviRigheIndice(testo: string): string {
  return testo.replace(RE_RIGA_INDICE, "");
}

/**
 * Maschera l'INTERA regione dell'indice con spazi, dalla prima all'ultima riga
 * con puntini di guida. Togliere le sole righe coi puntini non basta: le voci
 * lunghe vanno a capo, e la prima riga (senza puntini) resta e somiglia in tutto
 * a un titolo di sezione.
 *
 * Si sostituisce con spazi — non si cancella — perché gli offset del testo sono
 * la mappa verso i numeri di pagina: accorciare il testo sposterebbe le pagine
 * di ogni chunk successivo. Serve almeno una soglia di righe, altrimenti un
 * singolo "…" nel corpo rasa mezzo documento.
 */
const SOGLIA_RIGHE_INDICE = 3;

export function mascheraIndice(testo: string): string {
  const righe = [...testo.matchAll(RE_RIGA_INDICE)];
  if (righe.length < SOGLIA_RIGHE_INDICE) return testo;

  const prima = righe[0];
  const ultima = righe[righe.length - 1];
  const da = prima.index!;
  const a = ultima.index! + ultima[0].length;

  const mascherato = testo
    .slice(da, a)
    .replace(/[^\n]/g, " "); // conserva i newline → conserva gli offset di riga
  return testo.slice(0, da) + mascherato + testo.slice(a);
}

/** Normalizza il whitespace dei PDF (sillabazione a fine riga, righe spezzate). */
export function ripulisciTestoPdf(testo: string): string {
  return rimuoviRigheIndice(testo)
    .replace(/([a-zà-ù])-\n([a-zà-ù])/g, "$1$2") // sillabazione
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
