/**
 * Ravvedimento operoso (S9) — sanzione ridotta + interessi legali per un
 * versamento tardivo. Funzioni pure. Le percentuali/scaglioni vivono in
 * `constants.ts` e sono DA VERIFICARE: qui c'è solo l'aritmetica.
 */
import {
  SCAGLIONI_RAVVEDIMENTO,
  TASSO_LEGALE_ANNUO,
} from "./constants";
import { round2 } from "./money";

export type CalcoloRavvedimento = {
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  giorniRitardo: number;
  scaglione: string; // descrizione dello scaglione applicato
  sanzione: number;
  interessi: number;
  tassoLegaleAnnuo: number;
  totale: number; // importo + sanzione + interessi
};

/** Giorni di calendario tra due date ISO (YYYY-MM-DD), fine − inizio. */
export function giorniTra(da: string, a: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Calcola sanzione ridotta e interessi per un ravvedimento. Se il pagamento non
 * è in ritardo (giorni ≤ 0) sanzione e interessi sono nulli.
 */
export function calcolaRavvedimento(params: {
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  tassoLegaleAnnuo?: number;
}): CalcoloRavvedimento {
  const tasso = params.tassoLegaleAnnuo ?? TASSO_LEGALE_ANNUO;
  const giorniRitardo = giorniTra(params.dataScadenza, params.dataPagamento);

  const base = {
    importo: params.importo,
    dataScadenza: params.dataScadenza,
    dataPagamento: params.dataPagamento,
    giorniRitardo,
    tassoLegaleAnnuo: tasso,
  };

  if (giorniRitardo <= 0) {
    return {
      ...base,
      scaglione: "nessun ritardo",
      sanzione: 0,
      interessi: 0,
      totale: round2(params.importo),
    };
  }

  const scaglione =
    SCAGLIONI_RAVVEDIMENTO.find(
      (s) => s.entroGiorni !== null && giorniRitardo <= s.entroGiorni,
    ) ?? SCAGLIONI_RAVVEDIMENTO[SCAGLIONI_RAVVEDIMENTO.length - 1];

  const sanzione =
    "perGiorno" in scaglione
      ? round2(params.importo * scaglione.perGiorno * giorniRitardo)
      : round2(params.importo * scaglione.percentuale);

  const interessi = round2(
    (params.importo * tasso * giorniRitardo) / 365,
  );

  return {
    ...base,
    scaglione: scaglione.descrizione,
    sanzione,
    interessi,
    totale: round2(params.importo + sanzione + interessi),
  };
}
