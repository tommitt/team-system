/**
 * Formattazione degli output del corpus: provenienza citabile + avvisi temporali.
 *
 * Funzioni pure e testabili (nessun I/O): i tool `corpus_*` si limitano a
 * cucire queste stringhe. Due regole di prodotto vivono qui dentro:
 *
 * 1. **Nessuna fonte recuperata, nessuna asserzione.** Ogni risultato esce con
 *    estremi, percorso, pagina e URL: se non si può citare, non si può affermare.
 * 2. **L'avviso temporale è obbligatorio**, non decorativo. Se la domanda è su un
 *    anno d'imposta che il risultato (o l'intero corpus) non copre, l'avviso
 *    precede il contenuto. Contratto di `lookupVigente` (ADR 0011): meglio un
 *    caveat rumoroso di un testo stantio silenzioso.
 */
import type { CoperturaFonte } from "./copertura";
import type { Risultato } from "./search";

const NOME_FONTE: Record<string, string> = {
  prassi_ade: "Prassi Agenzia delle Entrate",
  istruzioni_modelli: "Istruzioni ai modelli",
  normattiva: "Normattiva (testo vigente)",
};

export function nomeFonte(fonte: string): string {
  return NOME_FONTE[fonte] ?? fonte;
}

/** Le pagine di provenienza, quando note: "p. 14" o "pp. 14-17". */
export function pagine(r: Pick<Risultato, "paginaDa" | "paginaA">): string | null {
  if (r.paginaDa === null) return null;
  if (r.paginaA === null || r.paginaA === r.paginaDa) return `p. ${r.paginaDa}`;
  return `pp. ${r.paginaDa}-${r.paginaA}`;
}

/**
 * La riga di provenienza: è ciò che rende l'output verificabile da un umano.
 * "Circolare 24/E del 02/08/2023 — § 1.1 …, pp. 4-6 — <url>"
 */
export function citazione(r: Risultato): string {
  // Il primo segmento del percorso ripete gli estremi: si mostra solo il resto.
  const sezione = r.percorso.split(" > ").slice(1).join(" > ");
  const parti = [r.estremi, sezione || null, pagine(r)].filter(Boolean);
  return `${parti.join(" — ")}\n  ${r.urlOrigine}`;
}

/** Vigenza leggibile: "in vigore dal 2024-01-01", "fino al 2023-12-31". */
export function vigenza(r: Pick<Risultato, "vigenzaDa" | "vigenzaA">): string | null {
  if (!r.vigenzaDa && !r.vigenzaA) return null;
  if (r.vigenzaDa && r.vigenzaA) return `vigenza ${r.vigenzaDa} → ${r.vigenzaA}`;
  if (r.vigenzaDa) return `in vigore dal ${r.vigenzaDa}`;
  return `in vigore fino al ${r.vigenzaA}`;
}

/**
 * L'avviso temporale per un singolo risultato: scatta se l'anno chiesto cade
 * fuori dalla vigenza del testo, o se il documento dichiara un anno d'imposta
 * diverso da quello chiesto (una regola del 2023 per una domanda 2026).
 */
export function avvisoTemporaleRisultato(
  r: Risultato,
  annoImposta?: number,
): string | null {
  if (annoImposta === undefined) return null;

  if (r.annoImposta !== null && r.annoImposta !== annoImposta) {
    return `⚠️ Questo testo riguarda l'anno d'imposta ${r.annoImposta}, non il ${annoImposta}.`;
  }

  const inizioAnno = `${annoImposta}-01-01`;
  const fineAnno = `${annoImposta}-12-31`;
  if (r.vigenzaA && r.vigenzaA < inizioAnno) {
    return `⚠️ Testo non più vigente per il ${annoImposta} (in vigore fino al ${r.vigenzaA}).`;
  }
  if (r.vigenzaDa && r.vigenzaDa > fineAnno) {
    return `⚠️ Testo non ancora vigente nel ${annoImposta} (in vigore dal ${r.vigenzaDa}).`;
  }
  return null;
}

/**
 * L'avviso di copertura: la domanda è su un anno più recente di qualunque cosa
 * abbiamo indicizzato. Questo è l'avviso che salva il professionista, perché
 * nessun singolo risultato può accorgersene da solo.
 */
export function avvisoCopertura(
  annoImposta: number | undefined,
  annoMassimo: number | null,
): string | null {
  if (annoImposta === undefined || annoMassimo === null) return null;
  if (annoImposta <= annoMassimo) return null;
  return (
    `⚠️ COPERTURA INSUFFICIENTE: la domanda riguarda l'anno d'imposta ${annoImposta}, ` +
    `ma la fonte più recente in corpus si ferma al ${annoMassimo}. ` +
    `Le regole del ${annoImposta} potrebbero essere cambiate: verificare su fonte viva ` +
    `prima di usare questi risultati.`
  );
}

/** Riepilogo della copertura, in fondo a ogni ricerca. */
export function formattaCopertura(coperture: CoperturaFonte[]): string {
  if (coperture.length === 0) return "Corpus vuoto: nessuna fonte indicizzata.";
  const righe = coperture.map((c) => {
    const dettagli = [
      `${c.documenti} doc.`,
      c.annoMax ? `anno d'imposta max ${c.annoMax}` : null,
      c.ultimaPubblicazione ? `ultima pubbl. ${c.ultimaPubblicazione}` : null,
    ].filter(Boolean);
    return `· ${nomeFonte(c.fonte)}: ${dettagli.join(", ")}`;
  });
  return `Copertura del corpus:\n${righe.join("\n")}`;
}

/** Un risultato di ricerca, pronto da stampare. */
export function formattaRisultato(
  r: Risultato,
  indice: number,
  annoImposta?: number,
): string {
  const L: string[] = [];
  L.push(`[${indice}] ${citazione(r)}`);

  const avviso = avvisoTemporaleRisultato(r, annoImposta);
  if (avviso) L.push(`  ${avviso}`);

  const v = vigenza(r);
  if (v) L.push(`  (${v})`);

  L.push("");
  L.push(virgolettato(r.testo));

  if (r.notaRedazionale) {
    L.push("");
    L.push(`  📝 Nota redazionale (approvata): ${r.notaRedazionale}`);
  }
  L.push(`  → per il contesto completo: corpus_leggi(chunk_id: ${r.chunkId})`);
  return L.join("\n");
}

/** Il testo della fonte, rientrato e citato — mai confuso con la nostra voce. */
function virgolettato(testo: string): string {
  return testo
    .split("\n")
    .map((riga) => `  > ${riga}`)
    .join("\n");
}
