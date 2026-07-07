/**
 * Helper di arrotondamento per gli importi fiscali. Puri, senza stato.
 */

/** Arrotonda ai centesimi (2 decimali), evitando errori di virgola mobile. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Arrotonda all'unità di euro (arrotondamento F24: ≥ 0,50 per eccesso,
 * < 0,50 per difetto). Gli importi sui modelli F24 vanno in euro interi.
 */
export function roundEuro(n: number): number {
  return Math.round(n);
}

/** Formatta un importo in euro nel formato italiano (es. "1.234,56 €"). */
export function euro(n: number): string {
  return (
    n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}
