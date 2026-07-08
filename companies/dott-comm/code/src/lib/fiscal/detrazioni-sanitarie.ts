/**
 * Detrazione IRPEF delle spese sanitarie (art. 15 c.1 lett. c TUIR) — logica
 * pura e testabile. Compone le costanti a peso legale del registro
 * (`constants.ts`) nella tabella di riepilogo per rigo e nella stima della
 * detrazione, applicando franchigia, obbligo di tracciabilità e tetti secondo le
 * istruzioni del Modello 730/2026 (periodo d'imposta 2025).
 *
 * Meccanica verificata sulle istruzioni ufficiali:
 * - la franchigia di €129,11 è UNICA e si applica alla SOMMA di E1 (col.1+col.2)
 *   ed E2 (E2 già capato a €6.197,48): `19% × max(0, (E1 + min(E2,cap)) − 129,11)`;
 * - E3 (mezzi/ausili/sussidi per disabili): 19% sull'INTERO importo, niente
 *   franchigia;
 * - E4 (veicoli disabili): 19% su `min(spesa, €18.075,99)`;
 * - E5 (cane guida): 19% sull'intero importo;
 * - E25 NON è una detrazione: le spese mediche generiche e di assistenza
 *   specifica dei disabili sono ONERI DEDUCIBILI (riducono il reddito, Sez. II).
 *   Qui vengono riconosciute e riportate a parte, MAI trattate al 19%.
 *
 * Valore aggiunto del modulo: il triage fiscale delle voci estratte da
 * scontrini/fatture — scarta le non detraibili e quelle senza tracciabilità
 * (art. 1 c.679-680 L.160/2019), net degli importi rimborsati, non conteggia le
 * voci eliminate vs precompilato, segnala i possibili doppi conteggi col Sistema
 * TS. La detrazione effettiva la calcola il sostituto/CAF sull'imposta capiente:
 * qui è una stima indicativa. Ogni output è una bozza.
 */
import {
  CAP_E2_PATOLOGIE_ESENTI,
  CAP_E4_VEICOLI_DISABILI,
  DETRAZIONE_SANITARIE_ALIQUOTA,
  FRANCHIGIA_SANITARIE,
  N_RATE_DETRAZIONE_SANITARIE,
  SOGLIA_RATEIZZAZIONE_SANITARIE,
} from "./constants";
import { round2 } from "./money";

/**
 * Rigo di destinazione nel Quadro E (Modello 730) / Quadro RP (Redditi PF).
 * E1–E5 sono detrazioni 19%; E25 è un onere DEDUCIBILE (Sez. II), trattato a
 * parte. E6 (quote di spese rateizzate in anni precedenti) non nasce dagli
 * scontrini dell'anno, quindi resta fuori da questa estrazione.
 */
export type RigoSanitario =
  | "E1c1"
  | "E1c2"
  | "E2"
  | "E3"
  | "E4"
  | "E5"
  | "E25";

/** I righi soggetti a detrazione 19% (E25 escluso: è deduzione). */
export const RIGHI_DETRAZIONE: readonly RigoSanitario[] = [
  "E1c1",
  "E1c2",
  "E2",
  "E3",
  "E4",
  "E5",
];

/** Tutti i righi riconosciuti, incluso E25 (deduzione). */
export const RIGHI_SANITARI: readonly RigoSanitario[] = [
  ...RIGHI_DETRAZIONE,
  "E25",
];

/** Etichetta leggibile per ogni rigo, per gli output. */
export const ETICHETTA_RIGO: Record<RigoSanitario, string> = {
  E1c1: "E1 col. 1 — patologie esenti",
  E1c2: "E1 col. 2 — spese sanitarie generiche",
  E2: "E2 — familiari non a carico con patologie esenti",
  E3: "E3 — persone con disabilità (mezzi/ausili/sussidi)",
  E4: "E4 — veicoli per persone con disabilità",
  E5: "E5 — cane guida per non vedenti",
  E25: "E25 — spese mediche generiche/assistenza specifica disabili (ONERE DEDUCIBILE)",
};

/** Azione della voce rispetto al 730 precompilato (Sistema TS). */
export type AzioneVsPrecompilato =
  | "confermata" // già in precompilata, accettata
  | "aggiunta" // non in precompilata, aggiunta dallo studio
  | "modificata" // in precompilata, importo corretto dallo studio
  | "eliminata"; // in precompilata ma da togliere (es. rimborsata)

/** Una voce di spesa estratta da uno scontrino/fattura, pronta al triage. */
export type VoceSpesa = {
  importo: number;
  rigo: RigoSanitario;
  /** false = da scartare (parafarmaco, integratore, spesa estetica…). */
  detraibile: boolean;
  /**
   * true se la spesa richiede pagamento tracciabile per essere detraibile.
   * false per farmaci, dispositivi medici e prestazioni di strutture pubbliche
   * o private accreditate al SSN (esenti da tracciabilità, comma 680).
   */
  tracciabilitaRichiesta: boolean;
  /** Rilevante solo se `tracciabilitaRichiesta`: pagata con mezzo tracciabile? */
  pagamentoTracciabile: boolean;
  /** true se la voce risulta già nel 730 precompilato (Sistema TS). */
  inPrecompilata: boolean;
  /** Azione rispetto al precompilato; default "aggiunta" se non in precompilata. */
  azione?: AzioneVsPrecompilato;
  /** Quota rimborsata (assicurazione/fondo sanitario/datore): NON detraibile. */
  rimborso?: number;
  // Campi descrittivi opzionali (per il report e il foglio, non per il calcolo)
  descrizione?: string;
  data?: string;
  fornitore?: string;
  intestatario?: string;
};

/** Perché una voce è entrata o è stata scartata dal totale. */
export type EsitoVoce =
  | "inclusa"
  | "esclusa_non_detraibile"
  | "esclusa_tracciabilita"
  | "esclusa_eliminata";

export type ValutazioneVoce = {
  indice: number;
  esito: EsitoVoce;
  rigo: RigoSanitario;
  /** Importo netto (al netto dell'eventuale rimborso) usato nei subtotali. */
  importo: number;
  /** Motivo leggibile quando la voce è esclusa. */
  motivo?: string;
};

export type CalcoloDetrazioneSanitarie = {
  /** Subtotali per rigo delle sole voci incluse (da trascrivere nel Quadro E/RP). */
  subtotali: Record<RigoSanitario, number>;
  /** Valutazione voce per voce (incluse ed escluse, con motivo). */
  valutazioni: ValutazioneVoce[];
  /** Somma delle voci incluse soggette a detrazione (E1–E5, esclude E25). */
  totaleIncluso: number;
  /** Franchigia applicata (unica, sul pool E1+E2). */
  franchigia: number;
  /** Aliquota di detrazione applicata. */
  aliquota: number;
  /** Stima indicativa della detrazione (la definitiva la calcola il sostituto). */
  detrazioneStima: number;
  /** Dettaglio della stima per rigo (già al netto di franchigia/tetti). */
  dettaglioDetrazione: Record<RigoSanitario, number>;
  /**
   * Oneri DEDUCIBILI del rigo E25 (spese mediche generiche/assistenza specifica
   * dei disabili): riducono il reddito imponibile, NON danno detrazione 19%.
   * Riportati a parte, mai sommati alla detrazione.
   */
  deduzioneE25: number;
  /** true se E1+E2+E3 (al lordo della franchigia) supera la soglia di rateizzazione. */
  rateizzabile: boolean;
  baseRateizzazione: number;
  /** Quota annua se si opta per la rateizzazione in 4 anni (solo se rateizzabile). */
  quotaAnnua?: number;
  /**
   * Totale delle voci incluse NON coperte dal precompilato-confermato
   * (aggiunte/modificate): è l'importo su cui va conservata la documentazione,
   * il più esposto al controllo formale.
   */
  totaleDocumentazioneARischio: number;
  /** Totale rimborsato scorporato dagli importi (non detraibile). */
  totaleRimborsato: number;
  /** Riepilogo degli scarti, per motivo. */
  scarti: {
    nonDetraibili: { conteggio: number; importo: number };
    tracciabilita: { conteggio: number; importo: number };
    eliminate: { conteggio: number; importo: number };
  };
  /** Avvisi non bloccanti (tetti superati, possibili doppi conteggi, ecc.). */
  avvisi: string[];
};

function vuotoPerRigo(): Record<RigoSanitario, number> {
  return { E1c1: 0, E1c2: 0, E2: 0, E3: 0, E4: 0, E5: 0, E25: 0 };
}

/** Azione effettiva: se non specificata, dedotta dalla presenza in precompilata. */
function azioneEffettiva(v: VoceSpesa): AzioneVsPrecompilato {
  if (v.azione) return v.azione;
  return v.inPrecompilata ? "confermata" : "aggiunta";
}

/** Importo netto: importo meno l'eventuale quota rimborsata, non negativo. */
function importoNetto(v: VoceSpesa): number {
  return Math.max(0, round2(v.importo - (v.rimborso ?? 0)));
}

/**
 * Applica il triage fiscale a una singola voce e ne determina l'esito.
 * L'ordine dei controlli è: eliminata → non detraibile → tracciabilità.
 */
export function valutaVoce(v: VoceSpesa, indice: number): ValutazioneVoce {
  const base = { indice, rigo: v.rigo, importo: importoNetto(v) };

  if (azioneEffettiva(v) === "eliminata") {
    return {
      ...base,
      esito: "esclusa_eliminata",
      motivo: "eliminata rispetto al precompilato (es. rimborsata)",
    };
  }
  if (!v.detraibile) {
    return {
      ...base,
      esito: "esclusa_non_detraibile",
      motivo: "spesa non detraibile (es. parafarmaco, integratore, spesa estetica)",
    };
  }
  if (v.tracciabilitaRichiesta && !v.pagamentoTracciabile) {
    return {
      ...base,
      esito: "esclusa_tracciabilita",
      motivo:
        "detrazione persa: pagamento non tracciabile per una spesa che lo richiede (art. 1 c.679-680 L. 160/2019)",
    };
  }
  return { ...base, esito: "inclusa" };
}

/**
 * Calcola i subtotali per rigo e la stima della detrazione a partire dalle voci
 * estratte. Applica la franchigia unica sul pool E1+E2, i tetti (E2, E4) e la
 * soglia di rateizzazione; tiene E25 come deduzione a parte; raccoglie scarti e
 * avvisi. Non decide nulla: produce una bozza.
 */
export function calcolaDetrazioneSanitarie(
  voci: readonly VoceSpesa[],
): CalcoloDetrazioneSanitarie {
  const aliquota = DETRAZIONE_SANITARIE_ALIQUOTA.valore;
  const franchigia = FRANCHIGIA_SANITARIE.valore;

  const valutazioni = voci.map((v, i) => valutaVoce(v, i));

  const subtotali = vuotoPerRigo();
  const scarti = {
    nonDetraibili: { conteggio: 0, importo: 0 },
    tracciabilita: { conteggio: 0, importo: 0 },
    eliminate: { conteggio: 0, importo: 0 },
  };
  let totaleDocumentazioneARischio = 0;
  let totaleRimborsato = 0;

  valutazioni.forEach((val, i) => {
    totaleRimborsato = round2(totaleRimborsato + (voci[i].rimborso ?? 0));
    if (val.esito === "inclusa") {
      subtotali[val.rigo] = round2(subtotali[val.rigo] + val.importo);
      const azione = azioneEffettiva(voci[i]);
      if (
        val.rigo !== "E25" &&
        (azione === "aggiunta" || azione === "modificata")
      ) {
        totaleDocumentazioneARischio = round2(
          totaleDocumentazioneARischio + val.importo,
        );
      }
    } else if (val.esito === "esclusa_non_detraibile") {
      scarti.nonDetraibili.conteggio += 1;
      scarti.nonDetraibili.importo = round2(scarti.nonDetraibili.importo + val.importo);
    } else if (val.esito === "esclusa_tracciabilita") {
      scarti.tracciabilita.conteggio += 1;
      scarti.tracciabilita.importo = round2(scarti.tracciabilita.importo + val.importo);
    } else if (val.esito === "esclusa_eliminata") {
      scarti.eliminate.conteggio += 1;
      scarti.eliminate.importo = round2(scarti.eliminate.importo + val.importo);
    }
  });

  const totaleIncluso = round2(
    RIGHI_DETRAZIONE.reduce((a, rg) => a + subtotali[rg], 0),
  );

  // --- Stima della detrazione per rigo -------------------------------------
  const dettaglioDetrazione = vuotoPerRigo();

  // Franchigia UNICA sul pool E1 (col.1+col.2) + E2 (capato).
  const impE2 = Math.min(subtotali.E2, CAP_E2_PATOLOGIE_ESENTI.valore);
  const baseE1E2 = round2(subtotali.E1c1 + subtotali.E1c2 + impE2);
  const eccedenza = Math.max(0, round2(baseE1E2 - franchigia));
  const detrE1E2 = round2(aliquota * eccedenza);
  // Ripartizione proporzionale del detrE1E2 tra E1c1, E1c2, E2 (solo dettaglio).
  if (baseE1E2 > 0) {
    dettaglioDetrazione.E1c1 = round2(detrE1E2 * (subtotali.E1c1 / baseE1E2));
    dettaglioDetrazione.E1c2 = round2(detrE1E2 * (subtotali.E1c2 / baseE1E2));
    dettaglioDetrazione.E2 = round2(
      detrE1E2 - dettaglioDetrazione.E1c1 - dettaglioDetrazione.E1c2,
    );
  }

  dettaglioDetrazione.E3 = round2(aliquota * subtotali.E3); // senza franchigia
  const impE4 = Math.min(subtotali.E4, CAP_E4_VEICOLI_DISABILI.valore);
  dettaglioDetrazione.E4 = round2(aliquota * impE4);
  dettaglioDetrazione.E5 = round2(aliquota * subtotali.E5);

  const detrazioneStima = round2(
    RIGHI_DETRAZIONE.reduce((a, rg) => a + dettaglioDetrazione[rg], 0),
  );

  // E25: onere deducibile, riportato a parte (mai 19%).
  const deduzioneE25 = subtotali.E25;

  // --- Rateizzazione (E1 + E2 + E3, al lordo della franchigia) --------------
  const baseRateizzazione = round2(
    subtotali.E1c1 + subtotali.E1c2 + subtotali.E2 + subtotali.E3,
  );
  const rateizzabile = baseRateizzazione > SOGLIA_RATEIZZAZIONE_SANITARIE.valore;
  const quotaAnnua = rateizzabile
    ? round2(detrazioneStima / N_RATE_DETRAZIONE_SANITARIE.valore)
    : undefined;

  // --- Avvisi non bloccanti ------------------------------------------------
  const avvisi: string[] = [];
  if (subtotali.E4 > CAP_E4_VEICOLI_DISABILI.valore) {
    avvisi.push(
      `Rigo E4: spesa ${subtotali.E4.toFixed(2)} € oltre il tetto di ${CAP_E4_VEICOLI_DISABILI.valore.toFixed(2)} €: detrazione calcolata sul tetto.`,
    );
  }
  if (subtotali.E2 > 0) {
    if (subtotali.E2 > CAP_E2_PATOLOGIE_ESENTI.valore) {
      avvisi.push(
        `Rigo E2: spesa ${subtotali.E2.toFixed(2)} € oltre il tetto di ${CAP_E2_PATOLOGIE_ESENTI.valore.toFixed(2)} €: detrazione calcolata sul tetto.`,
      );
    }
    avvisi.push(
      "Rigo E2: la franchigia di €129,11 è unica sul totale E1+E2; e la spesa è detraibile solo per la quota non capiente nell'IRPEF del familiare malato (dato dal suo 730-3/RN): la stima è un massimo teorico da ridurre.",
    );
  }
  if (subtotali.E25 > 0) {
    avvisi.push(
      `Rigo E25: ${subtotali.E25.toFixed(2)} € di spese mediche generiche/assistenza specifica per disabili sono ONERI DEDUCIBILI (riducono il reddito, Sez. II), NON detrazione 19%: trattamento separato. Attenzione a non instradare in E3 le spese mediche generiche dei disabili.`,
    );
  }
  if (totaleRimborsato > 0) {
    avvisi.push(
      `Scorporati ${totaleRimborsato.toFixed(2)} € di rimborsi (assicurazione/fondo/datore): non detraibili, dedotti dagli importi.`,
    );
  }
  // Possibili doppi conteggi: voce "aggiunta" ma segnalata come già in precompilata.
  const doppi = voci.filter(
    (v) => v.detraibile && v.inPrecompilata && azioneEffettiva(v) === "aggiunta",
  ).length;
  if (doppi > 0) {
    avvisi.push(
      `${doppi} voce/i risultano già in precompilata ma marcate come "aggiunta": possibile doppio conteggio col Sistema TS — verificare prima di sommare.`,
    );
  }
  if (rateizzabile) {
    avvisi.push(
      `Righi E1+E2+E3 = ${baseRateizzazione.toFixed(2)} € oltre ${SOGLIA_RATEIZZAZIONE_SANITARIE.valore.toFixed(2)} €: la detrazione è rateizzabile in ${N_RATE_DETRAZIONE_SANITARIE.valore} quote annuali (quote 2ª-4ª nel rigo E6 degli anni successivi).`,
    );
  }

  return {
    subtotali,
    valutazioni,
    totaleIncluso,
    franchigia,
    aliquota,
    detrazioneStima,
    dettaglioDetrazione,
    deduzioneE25,
    rateizzabile,
    baseRateizzazione,
    quotaAnnua,
    totaleDocumentazioneARischio,
    totaleRimborsato,
    scarti,
    avvisi,
  };
}
