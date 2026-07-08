/**
 * Calcolo di saldo e acconti per il cuneo del 20 luglio 2026 — funzioni pure.
 * Le regole/costanti vivono in `constants.ts`; qui c'è solo aritmetica testabile.
 */
import {
  ACCONTO_PERCENTUALE,
  ACCONTO_SOGLIA_MINIMA,
  ACCONTO_SOGLIA_RATEIZZO,
  ACCONTO_SOGLIA_RATEIZZO_ISA,
  PREVISIONALE_TOLLERANZA,
  SANZIONE_OMESSO_VERSAMENTO,
  SCADENZA_SALDO_ACCONTO,
  SCADENZA_SECONDO_ACCONTO,
  SPLIT_ACCONTO_ISA,
  SPLIT_ACCONTO_ORDINARIO,
} from "./constants";
import { roundEuro } from "./money";

/** Il regime determina lo split dell'acconto in due rate (40/60 vs 50/50). */
export type Regime = "ordinario" | "isa" | "forfettario" | "vantaggio";

const REGIMI_SPLIT_PARITARIO: ReadonlySet<Regime> = new Set<Regime>([
  "isa",
  "forfettario",
  "vantaggio",
]);

export type RataAcconto = {
  /** Frazione dell'acconto totale (0.4, 0.5, 0.6, 1.0). */
  quota: number;
  importo: number;
  scadenza: string; // YYYY-MM-DD
};

export type CalcoloAcconto = {
  dovuto: boolean;
  base: number; // rigo RN34 (o equivalente)
  percentuale: number;
  totale: number;
  modalita: "non_dovuto" | "unica_soluzione" | "due_rate";
  split: "40/60" | "50/50" | "-";
  prima?: RataAcconto;
  seconda?: RataAcconto;
};

/**
 * Acconto col metodo storico: 100% del rigo differenza (RN34), eventualmente
 * spezzato in due rate. Soggetti ISA/forfettari → 50/50 sopra €206; ordinari →
 * 40/60 sopra €257,52. Sotto €51,65 non dovuto; tra le soglie, unica soluzione
 * a novembre.
 */
export function calcolaAcconto(params: {
  base: number;
  regime: Regime;
  percentuale?: number;
}): CalcoloAcconto {
  const { base, regime } = params;
  const percentuale = params.percentuale ?? ACCONTO_PERCENTUALE.valore;
  const totale = roundEuro(base * percentuale);

  if (totale < ACCONTO_SOGLIA_MINIMA.valore) {
    return {
      dovuto: false,
      base,
      percentuale,
      totale,
      modalita: "non_dovuto",
      split: "-",
    };
  }

  // Unica soluzione a novembre sotto la soglia di rateizzo (che dipende dal
  // regime: €206 per ISA/forfettari, €257,52 per gli ordinari).
  const paritario = REGIMI_SPLIT_PARITARIO.has(regime);
  const sogliaRateizzo = paritario
    ? ACCONTO_SOGLIA_RATEIZZO_ISA.valore
    : ACCONTO_SOGLIA_RATEIZZO.valore;
  if (totale < sogliaRateizzo) {
    return {
      dovuto: true,
      base,
      percentuale,
      totale,
      modalita: "unica_soluzione",
      split: "-",
      prima: {
        quota: 1,
        importo: totale,
        scadenza: SCADENZA_SECONDO_ACCONTO.valore,
      },
    };
  }

  const split = paritario
    ? SPLIT_ACCONTO_ISA.valore
    : SPLIT_ACCONTO_ORDINARIO.valore;
  const primaImporto = roundEuro(totale * split.prima);
  // La seconda rata assorbe l'eventuale arrotondamento della prima.
  const secondaImporto = totale - primaImporto;

  return {
    dovuto: true,
    base,
    percentuale,
    totale,
    modalita: "due_rate",
    split: paritario ? "50/50" : "40/60",
    prima: {
      quota: split.prima,
      importo: primaImporto,
      scadenza: SCADENZA_SALDO_ACCONTO.valore,
    },
    seconda: {
      quota: split.seconda,
      importo: secondaImporto,
      scadenza: SCADENZA_SECONDO_ACCONTO.valore,
    },
  };
}

export type ValutazionePrevisionale = {
  impostaFinaleStimata: number;
  accontoStorico: number;
  accontoPrevisionale: number;
  /** Acconto che sarebbe dovuto se l'imposta finale coincide con la stima. */
  accontoRichiestoSuStima: number;
  /** Sotto questa soglia il tool segnala rischio (stima × (1 − tolleranza)). */
  sogliaRischio: number;
  tolleranza: number;
  risparmioVsStorico: number;
  /** Scoperto potenziale rispetto all'acconto richiesto sulla stima. */
  scopertoStimato: number;
  sanzionePotenziale: number;
  aRischio: boolean;
};

/**
 * Confronta il previsionale con lo storico ed espone la RIGA DI RISCHIO: quanto
 * si risparmia ora e quale scoperto/sanzione si rischia se l'imposta finale sarà
 * pari (o superiore) alla stima. La tolleranza è un'euristica di rischio, non una
 * franchigia di legge (vedi `constants.ts`).
 */
export function valutaPrevisionale(params: {
  accontoStorico: number;
  accontoPrevisionale: number;
  impostaFinaleStimata: number;
  percentuale?: number;
  tolleranza?: number;
  sanzione?: number;
}): ValutazionePrevisionale {
  const percentuale = params.percentuale ?? ACCONTO_PERCENTUALE.valore;
  const tolleranza = params.tolleranza ?? PREVISIONALE_TOLLERANZA.valore;
  const sanzione = params.sanzione ?? SANZIONE_OMESSO_VERSAMENTO.valore;

  const accontoRichiestoSuStima = roundEuro(
    params.impostaFinaleStimata * percentuale,
  );
  const sogliaRischio = roundEuro(accontoRichiestoSuStima * (1 - tolleranza));
  const scopertoStimato = Math.max(
    0,
    accontoRichiestoSuStima - params.accontoPrevisionale,
  );
  const sanzionePotenziale = roundEuro(scopertoStimato * sanzione);

  return {
    impostaFinaleStimata: params.impostaFinaleStimata,
    accontoStorico: params.accontoStorico,
    accontoPrevisionale: params.accontoPrevisionale,
    accontoRichiestoSuStima,
    sogliaRischio,
    tolleranza,
    risparmioVsStorico: roundEuro(
      params.accontoStorico - params.accontoPrevisionale,
    ),
    scopertoStimato,
    sanzionePotenziale,
    aRischio: params.accontoPrevisionale < sogliaRischio,
  };
}
