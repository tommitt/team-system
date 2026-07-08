/**
 * Termini perentori sugli atti notificati — funzioni pure (triage_atto).
 *
 * Dato il tipo di atto e la data di notifica, deriva i termini che l'atto fa
 * scattare (pagamento agevolato, ricorso, produzione documenti…), applicando
 * le sospensioni corrette (feriale processuale, sospensione estiva bonari,
 * +90 gg da istanza di adesione) e lo slittamento festivo. La CLASSIFICAZIONE
 * dell'atto (dal testo incollato al tipo) la fa il client; qui vive solo
 * l'aritmetica dei termini, che è la parte a peso legale.
 * Le regole/costanti stanno in `constants.ts`; il calendario in `calendario.ts`.
 */
import {
  ADESIONE_SOSPENSIONE_GG,
  RATE_ADER_SEMPLICE,
  RATE_BONARIO_MAX,
  RIDUZIONE_SANZIONE_ACQUIESCENZA,
  RIDUZIONE_SANZIONE_BONARIO,
  SOGLIA_ADER_SEMPLICE,
  SOSPENSIONE_BONARI,
  SOSPENSIONE_FERIALE,
  TERMINE_BONARIO_GG,
  TERMINE_BONARIO_TELEMATICO_GG,
  TERMINE_CARTELLA_GG,
  TERMINE_INTIMAZIONE_GG,
  TERMINE_PREAVVISO_FERMO_GG,
  TERMINE_RICORSO_GG,
} from "./constants";
import {
  scadenzaConSospensioni,
  slittaSeFestivo,
  type FinestraAnnuale,
} from "./calendario";

export type TipoAtto =
  | "avviso_bonario"
  | "controllo_formale"
  | "avviso_accertamento"
  | "cartella_pagamento"
  | "intimazione_pagamento"
  | "preavviso_fermo";

export type Termine = {
  chiave: string;
  descrizione: string;
  giorni: number;
  /** Scadenza già slittata se cade in giorno festivo. */
  scadenza: string; // YYYY-MM-DD
  /** Un termine perentorio mancato non si recupera. */
  perentorio: boolean;
  /** Sospensioni applicate nel conteggio (etichette leggibili). */
  sospensioni: string[];
  nota?: string;
};

export type TriageTermini = {
  tipo: TipoAtto;
  dataNotifica: string;
  termini: Termine[];
  /** Azioni tipicamente disponibili sull'atto, da valutare col professionista. */
  opzioni: string[];
};

const FERIALE_LABEL = "sospensione feriale 1–31/8 (L. 742/1969)";
const BONARI_LABEL = "sospensione estiva 1/8–4/9 (D.L. 193/2016)";

function termine(params: {
  chiave: string;
  descrizione: string;
  dataNotifica: string;
  giorni: number;
  perentorio: boolean;
  sospensioni?: { finestre: FinestraAnnuale[]; etichette: string[] };
  nota?: string;
}): Termine {
  const { finestre = [], etichette = [] } = params.sospensioni ?? {};
  const maturazione = scadenzaConSospensioni(
    params.dataNotifica,
    params.giorni,
    finestre,
  );
  return {
    chiave: params.chiave,
    descrizione: params.descrizione,
    giorni: params.giorni,
    scadenza: slittaSeFestivo(maturazione),
    perentorio: params.perentorio,
    sospensioni: etichette,
    nota: params.nota,
  };
}

/**
 * Deriva i termini attivati dall'atto. `conAdesione` aggiunge la variante del
 * termine di ricorso sospeso +90 gg (istanza di accertamento con adesione);
 * `telematicoIntermediario` usa il termine lungo dell'avviso bonario.
 */
export function calcolaTermini(params: {
  tipo: TipoAtto;
  dataNotifica: string;
  telematicoIntermediario?: boolean;
  conAdesione?: boolean;
}): TriageTermini {
  const { tipo, dataNotifica } = params;
  const feriale = {
    finestre: [SOSPENSIONE_FERIALE],
    etichette: [FERIALE_LABEL],
  };
  const termini: Termine[] = [];
  const opzioni: string[] = [];

  switch (tipo) {
    case "avviso_bonario": {
      const giorni = params.telematicoIntermediario
        ? TERMINE_BONARIO_TELEMATICO_GG
        : TERMINE_BONARIO_GG;
      termini.push(
        termine({
          chiave: "pagamento_agevolato",
          descrizione: `Pagamento (o prima rata) con sanzione ridotta a 1/3 (${giorni} gg)`,
          dataNotifica,
          giorni,
          perentorio: true,
          sospensioni: {
            finestre: [SOSPENSIONE_BONARI],
            etichette: [BONARI_LABEL],
          },
          nota: params.telematicoIntermediario
            ? "Termine lungo: esito reso disponibile in via telematica all'intermediario (art. 2-bis D.L. 203/2005)."
            : undefined,
        }),
      );
      opzioni.push(
        `Verificare la fondatezza: spesso è un F24 mal registrato o una compensazione non riconosciuta — se errato, istanza di rettifica via CIVIS (non sospende il termine).`,
        `Pagare con sanzione ridotta a 1/3 (${Math.round(RIDUZIONE_SANZIONE_BONARIO * 100)}% invece della piena) entro il termine.`,
        `Rateizzare fino a ${RATE_BONARIO_MAX} rate trimestrali (art. 3-bis D.Lgs. 462/1997): la prima rata entro lo stesso termine.`,
      );
      break;
    }

    case "controllo_formale": {
      termini.push(
        termine({
          chiave: "produzione_documenti",
          descrizione:
            "Produzione della documentazione richiesta (36-ter, termine indicato nell'atto)",
          dataNotifica,
          giorni: 30,
          perentorio: false,
          nota: "Termine ordinatorio di 30 gg salvo diversa indicazione nell'atto; spesso prorogabile su richiesta. DA VERIFICARE sull'atto.",
        }),
      );
      opzioni.push(
        "Assemblare il fascicolo (spese detratte, crediti, oneri) e trasmettere via CIVIS/PEC entro il termine.",
        "Se la documentazione non basta a evitare il rilievo, l'esito arriverà come comunicazione 36-ter: prepararsi al triage successivo.",
      );
      break;
    }

    case "avviso_accertamento": {
      termini.push(
        termine({
          chiave: "ricorso",
          descrizione: `Ricorso alla Corte di Giustizia Tributaria (${TERMINE_RICORSO_GG} gg)`,
          dataNotifica,
          giorni: TERMINE_RICORSO_GG,
          perentorio: true,
          sospensioni: feriale,
        }),
        termine({
          chiave: "acquiescenza",
          descrizione: `Acquiescenza: pagamento con sanzioni ridotte a 1/3 entro il termine di ricorso`,
          dataNotifica,
          giorni: TERMINE_RICORSO_GG,
          perentorio: true,
          sospensioni: feriale,
          nota: `Riduzione sanzioni a ${Math.round(RIDUZIONE_SANZIONE_ACQUIESCENZA * 100)}% (art. 15 D.Lgs. 218/1997), rinunciando a impugnare.`,
        }),
      );
      if (params.conAdesione) {
        termini.push(
          termine({
            chiave: "ricorso_con_adesione",
            descrizione: `Ricorso con istanza di adesione presentata (+${ADESIONE_SOSPENSIONE_GG} gg di sospensione)`,
            dataNotifica,
            giorni: TERMINE_RICORSO_GG + ADESIONE_SOSPENSIONE_GG,
            perentorio: true,
            sospensioni: feriale,
            nota: "L'istanza di adesione sospende il termine di ricorso per 90 gg (art. 6 D.Lgs. 218/1997), cumulabili con la feriale.",
          }),
        );
      }
      opzioni.push(
        "Istanza di accertamento con adesione: apre il contraddittorio e sospende il termine di ricorso di 90 gg — la mossa tattica standard.",
        "Acquiescenza (sanzioni a 1/3) se i rilievi sono fondati e conviene chiudere.",
        "Autotutela se l'atto è palesemente errato — NON sospende il termine di ricorso: correre comunque in parallelo.",
        "Ricorso entro il termine, con eventuale istanza di sospensione dell'esecuzione.",
      );
      break;
    }

    case "cartella_pagamento": {
      termini.push(
        termine({
          chiave: "pagamento",
          descrizione: `Pagamento delle somme iscritte a ruolo (${TERMINE_CARTELLA_GG} gg)`,
          dataNotifica,
          giorni: TERMINE_CARTELLA_GG,
          perentorio: true,
          nota: "Oltre il termine maturano interessi di mora e possono partire azioni esecutive/cautelari.",
        }),
        termine({
          chiave: "ricorso",
          descrizione: `Ricorso contro la cartella per vizi propri (${TERMINE_RICORSO_GG} gg)`,
          dataNotifica,
          giorni: TERMINE_RICORSO_GG,
          perentorio: true,
          sospensioni: feriale,
        }),
      );
      opzioni.push(
        "Verificare legittimità: decadenza/prescrizione, vizi di notifica degli atti presupposti, pagamenti già eseguiti.",
        `Rateizzazione AdE-Riscossione: fino a ${RATE_ADER_SEMPLICE} rate mensili su semplice richiesta sotto €${SOGLIA_ADER_SEMPLICE.toLocaleString("it-IT")} (DA VERIFICARE lo scaglione vigente); la richiesta blocca le azioni esecutive.`,
        "Sospensione legale (istanza ex L. 228/2012) se il ruolo è già annullato/pagato/prescritto.",
      );
      break;
    }

    case "intimazione_pagamento": {
      termini.push(
        termine({
          chiave: "pagamento",
          descrizione: `Pagamento intimato (${TERMINE_INTIMAZIONE_GG} gg, art. 50 DPR 602/1973)`,
          dataNotifica,
          giorni: TERMINE_INTIMAZIONE_GG,
          perentorio: true,
          nota: "Decorso il termine, l'esecuzione forzata può iniziare senza altri avvisi.",
        }),
      );
      opzioni.push(
        "Urgenza massima: valutare subito rateizzazione (che blocca l'esecuzione) o ricorso per vizi.",
        "Verificare che la cartella presupposta sia stata notificata regolarmente.",
      );
      break;
    }

    case "preavviso_fermo": {
      termini.push(
        termine({
          chiave: "pagamento_o_istanza",
          descrizione: `Pagamento o istanza per evitare il fermo (${TERMINE_PREAVVISO_FERMO_GG} gg)`,
          dataNotifica,
          giorni: TERMINE_PREAVVISO_FERMO_GG,
          perentorio: true,
          nota: "Il bene strumentale all'attività può essere escluso dal fermo su istanza documentata.",
        }),
      );
      opzioni.push(
        "Rateizzazione entro i 30 gg: evita l'iscrizione del fermo.",
        "Istanza di esclusione se il veicolo è bene strumentale (documentare).",
      );
      break;
    }
  }

  return { tipo, dataNotifica, termini, opzioni };
}
