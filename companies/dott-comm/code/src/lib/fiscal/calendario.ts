/**
 * Calendario civile italiano — funzioni pure di supporto ai calcoli di termini
 * e scadenze: festività nazionali (incluse Pasqua/Pasquetta), slittamento dei
 * termini che cadono in giorno festivo, aritmetica di date su stringhe ISO.
 * Nessuna dipendenza da timezone: tutte le date sono giorni civili "YYYY-MM-DD".
 */

/** Parse sicuro di "YYYY-MM-DD" in [anno, mese(1-12), giorno]. */
function parti(dataISO: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
  if (!m) throw new Error(`Data non ISO (YYYY-MM-DD): "${dataISO}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toISO(anno: number, mese: number, giorno: number): string {
  const mm = String(mese).padStart(2, "0");
  const gg = String(giorno).padStart(2, "0");
  return `${anno}-${mm}-${gg}`;
}

/** Aggiunge (o sottrae) n giorni civili a una data ISO. */
export function aggiungiGiorni(dataISO: string, n: number): string {
  const [a, m, g] = parti(dataISO);
  const d = new Date(Date.UTC(a, m - 1, g + n));
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Giorno della settimana: 0 = domenica … 6 = sabato. */
export function giornoSettimana(dataISO: string): number {
  const [a, m, g] = parti(dataISO);
  return new Date(Date.UTC(a, m - 1, g)).getUTCDay();
}

/**
 * Domenica di Pasqua per l'anno dato (algoritmo di Meeus/Butcher, calendario
 * gregoriano). Serve per Pasquetta (lunedì dell'Angelo), festività mobile.
 */
export function pasqua(anno: number): string {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=aprile
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(anno, mese, giorno);
}

/** Festività nazionali fisse (MM-DD). */
const FESTIVITA_FISSE = new Set([
  "01-01", // Capodanno
  "01-06", // Epifania
  "04-25", // Liberazione
  "05-01", // Festa del lavoro
  "06-02", // Repubblica
  "08-15", // Ferragosto
  "11-01", // Ognissanti
  "12-08", // Immacolata
  "12-25", // Natale
  "12-26", // Santo Stefano
]);

/**
 * Vero se la data è domenica o festività nazionale (incluso il lunedì
 * dell'Angelo). NB: i patroni locali non sono considerati.
 */
export function isFestivo(dataISO: string): boolean {
  if (giornoSettimana(dataISO) === 0) return true;
  const [anno] = parti(dataISO);
  if (FESTIVITA_FISSE.has(dataISO.slice(5))) return true;
  return dataISO === aggiungiGiorni(pasqua(anno), 1); // Pasquetta
}

/**
 * Slitta un termine che cade in giorno festivo al primo giorno lavorativo
 * successivo. Di default anche il sabato slitta (regola generale sia per i
 * versamenti — art. 6, c. 8, D.L. 330/1994 e art. 18 D.Lgs. 241/1997 — sia per
 * i termini processuali — art. 155 c.p.c.). DA VERIFICARE per casi particolari.
 */
export function slittaSeFestivo(
  dataISO: string,
  opts: { includiSabato?: boolean } = {},
): string {
  const includiSabato = opts.includiSabato ?? true;
  let d = dataISO;
  while (isFestivo(d) || (includiSabato && giornoSettimana(d) === 6)) {
    d = aggiungiGiorni(d, 1);
  }
  return d;
}

/** Finestra annuale ricorrente espressa come MM-DD (estremi inclusi). */
export type FinestraAnnuale = { inizio: string; fine: string };

/** Vero se la data cade nella finestra annuale (es. sospensione feriale). */
export function inFinestraAnnuale(
  dataISO: string,
  finestra: FinestraAnnuale,
): boolean {
  const mmdd = dataISO.slice(5);
  return mmdd >= finestra.inizio && mmdd <= finestra.fine;
}

/**
 * Conta `giorni` a partire dal giorno successivo a `dataInizio` (dies a quo non
 * computatur), saltando i giorni che cadono nelle finestre di sospensione
 * (es. sospensione feriale dei termini processuali, sospensione estiva dei
 * termini degli avvisi bonari). Restituisce il giorno in cui il termine matura,
 * SENZA slittamento festivo (applicarlo a valle con `slittaSeFestivo`).
 */
export function scadenzaConSospensioni(
  dataInizio: string,
  giorni: number,
  sospensioni: FinestraAnnuale[] = [],
): string {
  let d = dataInizio;
  let rimanenti = giorni;
  while (rimanenti > 0) {
    d = aggiungiGiorni(d, 1);
    const sospeso = sospensioni.some((f) => inFinestraAnnuale(d, f));
    if (!sospeso) rimanenti -= 1;
  }
  return d;
}
