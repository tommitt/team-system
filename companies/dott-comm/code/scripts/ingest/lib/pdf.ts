/**
 * Estrazione testo dai PDF (unpdf — pdf.js senza le dipendenze native).
 *
 * Estraiamo PER PAGINA e non in un unico blob perché `pagina_da/pagina_a` è
 * provenienza citabile: "Circolare 24/E, §3.2, p. 14" è verificabile, "Circolare
 * 24/E" no.
 *
 * ESCAPE HATCH documentata (ADR 0014): i fascicoli di istruzioni ai modelli sono
 * multi-colonna e ostili. Se la qualità di estrazione non regge, si aggiunge un
 * sidecar Python/PyMuPDF sotto `scripts/ingest/py/` — solo su macchina dev, mai
 * su Vercel. Prima di scrivere il sidecar, misurare: `--dry-run` stampa i chunk.
 */
import { extractText, getDocumentProxy } from "unpdf";

export type PaginaPdf = { numero: number; testo: string };

export async function estraiPagine(pdf: Buffer): Promise<PaginaPdf[]> {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(doc, { mergePages: false });
  const pagine = Array.isArray(text) ? text : [text];
  return pagine.map((testo, i) => ({ numero: i + 1, testo }));
}

/**
 * Concatena le pagine tenendo una mappa offset→pagina, così un chunk ritagliato
 * sul testo unito sa ancora da quali pagine viene.
 */
export type TestoPaginato = {
  testo: string;
  /** Offset di inizio di ogni pagina nel testo concatenato. */
  offsets: { numero: number; inizio: number; fine: number }[];
};

export function unisciPagine(pagine: PaginaPdf[]): TestoPaginato {
  let testo = "";
  const offsets: TestoPaginato["offsets"] = [];
  for (const p of pagine) {
    const inizio = testo.length;
    testo += p.testo + "\n";
    offsets.push({ numero: p.numero, inizio, fine: testo.length });
  }
  return { testo, offsets };
}

/** Pagina che contiene un dato offset (la prima il cui intervallo lo copre). */
export function paginaDiOffset(mappa: TestoPaginato, offset: number): number {
  for (const o of mappa.offsets) {
    if (offset >= o.inizio && offset < o.fine) return o.numero;
  }
  return mappa.offsets[mappa.offsets.length - 1]?.numero ?? 1;
}
