/**
 * Ravvedimento operoso (S9) — sanzione ridotta + interessi legali per un
 * versamento tardivo. Funzioni pure. Scaglioni e tassi vivono nel registro
 * (`constants.ts`) con la loro provenienza; qui c'è solo l'aritmetica.
 *
 * Modello (violazioni dal 1/9/2024, riforma D.Lgs. 87/2024):
 * - scaglioni temporali fino a 1 anno; oltre, lett. b-bis SENZA tetto di
 *   giorni; lett. b-ter su trigger PROCEDURALE (schema di atto ricevuto);
 * - interessi legali pro-rata per segmento d'anno (il tasso cambia con DM MEF).
 */
import {
  RIFORMA_SANZIONI_DAL,
  SCAGLIONI_RAVVEDIMENTO,
  tassoLegale,
  type ScaglioneRavvedimento,
} from "./constants";
import { round2 } from "./money";

export type InteressiAnno = {
  anno: number;
  tasso: number;
  giorni: number;
  interessi: number;
  /** false se il tasso dell'anno non è verificato nel registro. */
  verificato: boolean;
};

export type CalcoloRavvedimento = {
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  giorniRitardo: number;
  scaglione: string; // descrizione dello scaglione applicato
  sanzione: number;
  interessi: number;
  /** Dettaglio pro-rata degli interessi per anno di calendario. */
  interessiPerAnno: InteressiAnno[];
  totale: number; // importo + sanzione + interessi
  /** Caveat da esporre SEMPRE nell'output (regimi non modellati, tassi non verificati…). */
  avvertenze: string[];
};

/** Giorni di calendario tra due date ISO (YYYY-MM-DD), fine − inizio. */
export function giorniTra(da: string, a: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Interessi legali pro-rata: per ogni anno di calendario attraversato dal
 * ritardo applica il tasso vigente in quell'anno (giorni maturati dal giorno
 * successivo alla scadenza fino al pagamento incluso, base 365).
 */
export function interessiLegaliProRata(params: {
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  /** Override: un unico tasso su tutto il periodo (salta la tabella). */
  tassoAnnuo?: number;
}): { totale: number; perAnno: InteressiAnno[] } {
  const { importo, dataScadenza, dataPagamento } = params;
  const giorniTotali = giorniTra(dataScadenza, dataPagamento);
  if (giorniTotali <= 0) return { totale: 0, perAnno: [] };

  const annoInizio = Number(dataScadenza.slice(0, 4));
  const annoFine = Number(dataPagamento.slice(0, 4));
  const perAnno: InteressiAnno[] = [];

  for (let anno = annoInizio; anno <= annoFine; anno++) {
    // Segmento dell'anno interessato dal ritardo: (scadenza, pagamento].
    const inizioSegmento =
      anno === annoInizio ? dataScadenza : `${anno - 1}-12-31`;
    const fineSegmento = anno === annoFine ? dataPagamento : `${anno}-12-31`;
    const giorni = giorniTra(inizioSegmento, fineSegmento);
    if (giorni <= 0) continue;

    const lookup =
      params.tassoAnnuo !== undefined
        ? { valore: params.tassoAnnuo, verificato: true }
        : tassoLegale(`${anno}-06-30`);
    perAnno.push({
      anno,
      tasso: lookup.valore,
      giorni,
      interessi: round2((importo * lookup.valore * giorni) / 365),
      verificato: lookup.verificato,
    });
  }

  return {
    totale: round2(perAnno.reduce((acc, s) => acc + s.interessi, 0)),
    perAnno,
  };
}

/** Sceglie lo scaglione applicabile: trigger procedurale prima, poi temporali. */
function scaglioneApplicabile(
  giorniRitardo: number,
  schemaDiAttoRicevuto: boolean,
): ScaglioneRavvedimento {
  if (schemaDiAttoRicevuto) {
    return SCAGLIONI_RAVVEDIMENTO.find(
      (s) => s.trigger.tipo === "schema_di_atto",
    )!;
  }
  const temporale = SCAGLIONI_RAVVEDIMENTO.find(
    (s) => s.trigger.tipo === "entro_giorni" && giorniRitardo <= s.trigger.giorni,
  );
  return (
    temporale ??
    SCAGLIONI_RAVVEDIMENTO.find((s) => s.trigger.tipo === "oltre_annuale")!
  );
}

/**
 * Calcola sanzione ridotta e interessi per un ravvedimento. Se il pagamento non
 * è in ritardo (giorni ≤ 0) sanzione e interessi sono nulli.
 * `schemaDiAttoRicevuto`: comunicato lo schema di atto ex art. 6-bis L.
 * 212/2000, si applica la lett. b-ter (1/6) a prescindere dai giorni.
 */
export function calcolaRavvedimento(params: {
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  tassoLegaleAnnuo?: number;
  schemaDiAttoRicevuto?: boolean;
}): CalcoloRavvedimento {
  const giorniRitardo = giorniTra(params.dataScadenza, params.dataPagamento);
  const avvertenze: string[] = [];

  const base = {
    importo: params.importo,
    dataScadenza: params.dataScadenza,
    dataPagamento: params.dataPagamento,
    giorniRitardo,
  };

  if (giorniRitardo <= 0) {
    return {
      ...base,
      scaglione: "nessun ritardo",
      sanzione: 0,
      interessi: 0,
      interessiPerAnno: [],
      totale: round2(params.importo),
      avvertenze,
    };
  }

  if (params.dataScadenza < RIFORMA_SANZIONI_DAL.valore) {
    avvertenze.push(
      `Violazione anteriore al ${RIFORMA_SANZIONI_DAL.valore}: si applica il regime SANZIONATORIO PRE-RIFORMA (base 30%, scaglioni diversi), che questo calcolo NON modella — i valori sotto NON sono validi per questo caso.`,
    );
  }

  const scaglione = scaglioneApplicabile(
    giorniRitardo,
    params.schemaDiAttoRicevuto ?? false,
  );
  if (scaglione.trigger.tipo === "oltre_annuale") {
    avvertenze.push(
      "Scaglione oltre l'annuale (lett. b-bis): applicabile solo finché non è intervenuto un atto istruttorio; se è stato comunicato uno schema di atto, ricalcolare con `schema_di_atto` = true.",
    );
  }

  const sanzione =
    scaglione.perGiorno !== undefined
      ? round2(params.importo * scaglione.perGiorno * giorniRitardo)
      : round2(params.importo * (scaglione.percentuale ?? 0));

  const { totale: interessi, perAnno } = interessiLegaliProRata({
    importo: params.importo,
    dataScadenza: params.dataScadenza,
    dataPagamento: params.dataPagamento,
    tassoAnnuo: params.tassoLegaleAnnuo,
  });
  for (const s of perAnno) {
    if (!s.verificato) {
      avvertenze.push(
        `Tasso legale ${s.anno} (${(s.tasso * 100).toFixed(2)}%) non verificato nel registro: confermare su DM MEF prima dell'uso.`,
      );
    }
  }

  return {
    ...base,
    scaglione: scaglione.descrizione,
    sanzione,
    interessi,
    interessiPerAnno: perAnno,
    totale: round2(params.importo + sanzione + interessi),
    avvertenze,
  };
}
