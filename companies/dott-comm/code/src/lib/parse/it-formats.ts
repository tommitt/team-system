/**
 * Parser e validatori deterministici per formati italiani, usati da S7
 * `estrai_documenti` per normalizzare ciò che il client ha già estratto/OCR.
 * Funzioni pure e testabili.
 */

/**
 * Interpreta un importo in formato italiano ("1.234,56", "€ 1.234,56", "1234").
 * Regola: se c'è la virgola è il separatore decimale e i punti sono migliaia;
 * senza virgola si interpreta il punto come decimale. Ritorna null se non
 * numerico.
 */
export function parseImportoIt(input: string): number | null {
  const s = input.replace(/[€\s]/g, "").trim();
  if (s === "") return null;
  let normalized: string;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = s;
  }
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizza una data in ISO YYYY-MM-DD. Accetta dd/mm/yyyy, dd-mm-yyyy,
 * dd.mm.yyyy e yyyy-mm-dd. Ritorna null se non valida o inesistente.
 */
export function parseDataIt(input: string): string | null {
  const s = input.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isValidYmd(+iso[1], +iso[2], +iso[3]) ? s : null;

  const it = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (it) {
    const [, d, m, y] = it;
    if (!isValidYmd(+y, +m, +d)) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Valida una partita IVA italiana: 11 cifre con cifra di controllo (algoritmo
 * di Luhn sui pari, art. DM 23/12/1976). Verifica strutturale, non l'esistenza.
 */
export function validaPartitaIva(input: string): boolean {
  const s = input.replace(/\s/g, "");
  if (!/^\d{11}$/.test(s)) return false;
  let somma = 0;
  for (let i = 0; i < 11; i++) {
    let cifra = Number(s[i]);
    if (i % 2 === 1) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }
    somma += cifra;
  }
  return somma % 10 === 0;
}

/** Verifica la forma di un codice fiscale persona fisica (16 caratteri). */
export function validaCodiceFiscale(input: string): boolean {
  const s = input.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(s);
}
