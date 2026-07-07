/**
 * Piano di rateizzazione dei versamenti da dichiarazione — funzioni pure.
 * Modello: prima rata alla scadenza del versamento, rate successive il giorno 16
 * di ogni mese, ultima entro il 16/12; interesse 0,33% mensile (~4% annuo) sulla
 * quota capitale delle rate successive alla prima. Vedi `constants.ts`.
 */
import {
  INTERESSE_RATEIZZO_MENSILE,
  RATE_MAX,
  SCADENZA_ULTIMA_RATA,
} from "./constants";
import { round2 } from "./money";

export type Rata = {
  numero: number;
  scadenza: string; // YYYY-MM-DD
  quotaCapitale: number;
  interessi: number;
  importo: number;
};

export type PianoRate = {
  importoTotale: number;
  nRateRichieste: number;
  nRateEffettive: number;
  /** true se il numero di rate è stato ridotto per rispettare il 16/12. */
  capato: boolean;
  rate: Rata[];
  totaleInteressi: number;
  totaleConInteressi: number;
};

/** Il 16 del mese (year, monthIndex0 possono eccedere: vengono normalizzati). */
function sedicesimo(year: number, monthIndex0: number): string {
  const y = year + Math.floor(monthIndex0 / 12);
  const m = ((monthIndex0 % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}-16`;
}

/**
 * Costruisce il piano rate. La prima rata cade a `dataPrimaRata`; le successive
 * il 16 di ogni mese seguente. Le rate che supererebbero il 16/12 vengono
 * scartate (con `capato = true`), rispettando anche il massimo di 7 rate.
 */
export function pianoRate(params: {
  importoTotale: number;
  nRate: number;
  dataPrimaRata: string; // YYYY-MM-DD
}): PianoRate {
  const { importoTotale, dataPrimaRata } = params;
  const nRateRichieste = Math.max(1, Math.min(params.nRate, RATE_MAX));

  const [annoStr, meseStr] = dataPrimaRata.split("-");
  const anno = Number(annoStr);
  const mese0 = Number(meseStr) - 1;

  // Scadenze candidate: la prima alla data data, le altre il 16 dei mesi dopo.
  const scadenze: string[] = [dataPrimaRata];
  for (let i = 1; i < nRateRichieste; i++) {
    const s = sedicesimo(anno, mese0 + i);
    if (s > SCADENZA_ULTIMA_RATA) break;
    scadenze.push(s);
  }
  const nRateEffettive = scadenze.length;
  const capato = nRateEffettive < nRateRichieste;

  const quotaCapitale = round2(importoTotale / nRateEffettive);
  const rate: Rata[] = scadenze.map((scadenza, idx) => {
    const numero = idx + 1;
    // L'ultima rata assorbe l'arrotondamento sulla quota capitale.
    const capitale =
      numero === nRateEffettive
        ? round2(importoTotale - quotaCapitale * (nRateEffettive - 1))
        : quotaCapitale;
    const interessi = round2(
      capitale * INTERESSE_RATEIZZO_MENSILE * (numero - 1),
    );
    return {
      numero,
      scadenza,
      quotaCapitale: capitale,
      interessi,
      importo: round2(capitale + interessi),
    };
  });

  const totaleInteressi = round2(
    rate.reduce((acc, r) => acc + r.interessi, 0),
  );

  return {
    importoTotale,
    nRateRichieste,
    nRateEffettive,
    capato,
    rate,
    totaleInteressi,
    totaleConInteressi: round2(importoTotale + totaleInteressi),
  };
}
