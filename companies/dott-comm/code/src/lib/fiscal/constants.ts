/**
 * Registro delle costanti fiscali (ADR 0011).
 *
 * ⚠️ PESO LEGALE. Ogni valore qui è una regola pubblica con conseguenze
 * economiche per il contribuente. Ogni costante è un dato con provenienza —
 * `{ valore, fonte, verificatoIl }` — e i valori che cambiano nel tempo sono
 * tabelle tempo-indicizzate consultate via `lookupVigente` (mai un default
 * stantio silenzioso). Il resto del motore resta pura aritmetica testabile;
 * gli output dei tool espongono le assunzioni con fonte e data di verifica:
 * la decisione resta umana (human-in-the-loop, vedi `catalogo-skills-tools.md`).
 *
 * Verifica di massa: 2026-07-07, su fonti ufficiali (AdE, GU, DM MEF) e stampa
 * fiscale professionale concordante. Ri-verifica: skill `/verifica-costanti`,
 * a dicembre/gennaio (rollover annuale) e prima di ogni campagna.
 */
import {
  costante,
  lookupVigente,
  type Lookup,
  type Provenienza,
  type VoceVigente,
} from "./registry";

// --- Scadenze del cuneo (D.L. 89/2026) ------------------------------------

/** Saldo 2025 + 1ª rata acconto 2026, senza maggiorazione (proroga). */
export const SCADENZA_SALDO_ACCONTO = costante(
  "2026-07-20",
  "D.L. 89/2026 art. 6 (GU n. 117 del 22/5/2026) — verificare eventuali modifiche in sede di conversione",
  "2026-07-07",
);
/** Seconda finestra: stessi importi con maggiorazione dello 0,80%. */
export const SCADENZA_SALDO_ACCONTO_MAGGIORATA = costante(
  "2026-08-20",
  "D.L. 89/2026 art. 6 (il 19/8 cade in sospensione feriale → 20/8)",
  "2026-07-07",
);
/** Seconda rata di acconto 2026. */
export const SCADENZA_SECONDO_ACCONTO = costante(
  "2026-11-30",
  "art. 17 DPR 435/2001 (termine ordinario, non toccato dal D.L. 89/2026)",
  "2026-07-07",
);
/** Ultima rata utile per la rateizzazione dei versamenti da dichiarazione. */
export const SCADENZA_ULTIMA_RATA = costante(
  "2026-12-16",
  "art. 20 D.Lgs. 241/1997 (rateizzazione fino a 7 rate mensili, ultima il 16/12)",
  "2026-07-07",
);

/**
 * Maggiorazione per chi paga nella finestra 21/7–20/8. NB: lo 0,80% è una
 * DEROGA specifica 2026 (D.L. 89/2026 art. 6) al regime ordinario dello 0,40%
 * (art. 17 c.2 DPR 435/2001) — raddoppio contestato da Confprofessioni.
 */
export const MAGGIORAZIONE_DIFFERIMENTO = costante(
  0.008, // 0,80%
  "D.L. 89/2026 art. 6, in deroga all'art. 17 c.2 DPR 435/2001 (0,40% ordinario)",
  "2026-07-07",
);

// --- Acconto (metodo storico) ---------------------------------------------

/**
 * Percentuale dell'acconto sul rigo "differenza" del quadro (RN34 per le PF):
 * 100% per IRPEF, imposta sostitutiva forfettari, cedolare secca.
 * ⚠️ NON vale per le addizionali IRPEF: la comunale ha un acconto SEPARATO al
 * 30% (art. 1 c.4 D.Lgs. 360/1998), la regionale non ha acconto — non
 * applicare questa costante alle addizionali.
 */
export const ACCONTO_PERCENTUALE = costante(
  1.0, // 100%
  "agenziaentrate.gov.it — come si paga l'IRPEF (rigo differenza RN34)",
  "2026-07-07",
);

/** Sotto questa soglia (rigo differenza) l'acconto IRPEF non è dovuto. */
export const ACCONTO_SOGLIA_MINIMA = costante(
  51.65,
  "agenziaentrate.gov.it — come si paga l'IRPEF",
  "2026-07-07",
);

/**
 * Soglia oltre la quale l'acconto ORDINARIO si versa in due rate (40%/60%);
 * sotto, in unica soluzione a novembre.
 */
export const ACCONTO_SOGLIA_RATEIZZO = costante(
  257.52,
  "agenziaentrate.gov.it — come si paga l'IRPEF (prassi su art. 17 DPR 435/2001)",
  "2026-07-07",
);

/**
 * Soglia per ISA/forfettari: sotto, acconto in unica soluzione entro il 30/11;
 * sopra, due rate di pari importo (50/50).
 */
export const ACCONTO_SOGLIA_RATEIZZO_ISA = costante(
  206,
  "agenziaentrate.gov.it — come si paga l'IRPEF (soggetti ISA/forfettari)",
  "2026-07-07",
);

/** Split ordinario dell'acconto in due rate. */
export const SPLIT_ACCONTO_ORDINARIO = costante(
  { prima: 0.4, seconda: 0.6 } as const,
  "art. 17 DPR 435/2001",
  "2026-07-07",
);
/** Split per soggetti ISA e forfettari: due rate di pari importo. */
export const SPLIT_ACCONTO_ISA = costante(
  { prima: 0.5, seconda: 0.5 } as const,
  "art. 12-quinquies D.L. 34/2019 — vigenza 2026 confermata (nessuna abrogazione trovata)",
  "2026-07-07",
);

// --- Acconto (metodo previsionale) ----------------------------------------

/**
 * Tolleranza sul previsionale usata come SOGLIA DI RISCHIO nel prospetto:
 * se il versato scende sotto (imposta finale × (1 − tolleranza)) il tool
 * segnala il rischio di sanzione. NB: è un'euristica di rischio esposta come
 * assunzione, non una franchigia di legge — il professionista la conferma.
 */
export const PREVISIONALE_TOLLERANZA = costante(
  0.2, // 20%
  "euristica di prodotto (non è una franchigia di legge)",
  null,
);

/**
 * Sanzione base per insufficiente/omesso versamento, violazioni dal 1/9/2024:
 * 25% (era 30%). Ritardo ≤90 gg: dimezzata al 12,5% (vedi scaglioni).
 * Per violazioni ANTERIORI al 1/9/2024 la base resta 30%/15% — regime non
 * modellato qui (vedi avvertenze in `ravvedimento.ts`).
 */
export const SANZIONE_OMESSO_VERSAMENTO = costante(
  0.25, // 25%
  "art. 13 D.Lgs. 471/1997 come modificato da D.Lgs. 87/2024 (violazioni dal 1/9/2024); agenziaentrate.gov.it — ravvedimento",
  "2026-07-07",
);

// --- Rateizzazione (art. 20 D.Lgs. 241/1997) ------------------------------

/** Numero massimo di rate per i versamenti da dichiarazione (ultima al 16/12). */
export const RATE_MAX = costante(
  7,
  "art. 20 D.Lgs. 241/1997",
  "2026-07-07",
);
/**
 * Interesse di rateazione: 0,33% al mese (~4% annuo), applicato in modo
 * progressivo sulle rate successive alla prima (0,33% sulla 2ª, 0,66% sulla
 * 3ª, …). Fisso per legge, INDIPENDENTE dal tasso legale.
 */
export const INTERESSE_RATEIZZO_MENSILE = costante(
  0.0033, // 0,33%/mese
  "art. 20 D.Lgs. 241/1997 (tabelle AdE)",
  "2026-07-07",
);

// --- Tasso legale (interessi da ravvedimento) ------------------------------

/**
 * Tasso legale annuo — cambia ogni anno con DM MEF: tabella tempo-indicizzata,
 * consultata per data via `tassoLegale()`. Un ritardo che attraversa più anni
 * matura interessi pro-rata per segmento d'anno (vedi `ravvedimento.ts`).
 */
export const TASSO_LEGALE: readonly VoceVigente<number>[] = [
  {
    valore: 0.025, // 2,50%
    vigenzaDa: "2024-01-01",
    vigenzaA: "2024-12-31",
    fonte: "DM MEF 29/11/2023 — conoscenza pregressa, non riverificato nella sessione 2026-07-07",
    verificatoIl: null,
  },
  {
    valore: 0.02, // 2,00%
    vigenzaDa: "2025-01-01",
    vigenzaA: "2025-12-31",
    fonte: "DM MEF 10/12/2024; fiscooggi.it",
    verificatoIl: "2026-07-07",
  },
  {
    valore: 0.016, // 1,60%
    vigenzaDa: "2026-01-01",
    vigenzaA: "2026-12-31",
    fonte: "DM MEF 10/12/2025 (GU Serie Generale n. 289 del 13/12/2025); fiscooggi.it",
    verificatoIl: "2026-07-07",
  },
];

/** Tasso legale vigente alla data (con stato di verifica). */
export function tassoLegale(dataISO: string): Lookup<number> {
  return lookupVigente("tasso legale", TASSO_LEGALE, dataISO);
}

// --- Ravvedimento operoso (art. 13 D.Lgs. 472/1997) -----------------------

/**
 * Scaglioni per violazioni dal 1/9/2024 (base 25%, ridotta a 12,5% entro 90
 * gg — riforma D.Lgs. 87/2024). Il trigger non è sempre temporale:
 * - lett. b-bis (1/7 di 25%): oltre il termine dichiarazione/1 anno, SENZA
 *   tetto di giorni, finché non interviene un atto istruttorio;
 * - lett. b-ter (1/6 di 25%): trigger PROCEDURALE — dopo la comunicazione
 *   dello schema di atto ex art. 6-bis L. 212/2000 (contraddittorio
 *   preventivo), non dopo N giorni.
 */
export type TriggerScaglione =
  | { tipo: "entro_giorni"; giorni: number }
  | { tipo: "oltre_annuale" } // lett. b-bis, senza tetto temporale
  | { tipo: "schema_di_atto" }; // lett. b-ter, trigger procedurale

export type ScaglioneRavvedimento = Provenienza & {
  chiave: string;
  trigger: TriggerScaglione;
  /** Percentuale fissa sull'imposta (alternativa a `perGiorno`). */
  percentuale?: number;
  /** Quota giornaliera sull'imposta (ravvedimento sprint). */
  perGiorno?: number;
  descrizione: string;
};

const FONTE_RAVVEDIMENTO =
  "art. 13 D.Lgs. 472/1997 (riforma D.Lgs. 87/2024, violazioni dal 1/9/2024); agenziaentrate.gov.it — ravvedimento";

export const SCAGLIONI_RAVVEDIMENTO: readonly ScaglioneRavvedimento[] = [
  {
    chiave: "sprint",
    trigger: { tipo: "entro_giorni", giorni: 14 },
    perGiorno: 0.000833, // 1/15 al giorno di 12,5%, poi 1/10 (lett. a)
    descrizione: "entro 14 giorni (ravvedimento sprint, ~0,0833%/giorno)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
  {
    chiave: "breve",
    trigger: { tipo: "entro_giorni", giorni: 30 },
    percentuale: 0.0125, // 1/10 del 12,5% (lett. a)
    descrizione: "entro 30 giorni (1/10 di 12,5% = 1,25%)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
  {
    chiave: "trimestrale",
    trigger: { tipo: "entro_giorni", giorni: 90 },
    percentuale: 0.0139, // 1/9 del 12,5% (lett. a-bis)
    descrizione: "entro 90 giorni (1/9 di 12,5% ≈ 1,39%)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
  {
    chiave: "annuale",
    trigger: { tipo: "entro_giorni", giorni: 365 },
    percentuale: 0.03125, // 1/8 del 25% (lett. b)
    descrizione:
      "entro il termine della dichiarazione / 1 anno (1/8 di 25% = 3,125%)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
  {
    chiave: "oltre_annuale",
    trigger: { tipo: "oltre_annuale" },
    percentuale: 0.035714, // 1/7 del 25% (lett. b-bis)
    descrizione:
      "oltre il termine della dichiarazione / 1 anno, senza tetto di giorni, fino a un atto istruttorio (1/7 di 25% ≈ 3,57%)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
  {
    chiave: "schema_di_atto",
    trigger: { tipo: "schema_di_atto" },
    percentuale: 0.041667, // 1/6 del 25% (lett. b-ter)
    descrizione:
      "dopo la comunicazione dello schema di atto ex art. 6-bis L. 212/2000 (1/6 di 25% ≈ 4,17%)",
    fonte: FONTE_RAVVEDIMENTO,
    verificatoIl: "2026-07-07",
  },
];

/** Le violazioni anteriori a questa data seguono il regime pre-riforma (base 30%). */
export const RIFORMA_SANZIONI_DAL = costante(
  "2024-09-01",
  "D.Lgs. 87/2024 (decorrenza della riforma delle sanzioni)",
  "2026-07-07",
);

// --- Termini sugli atti notificati (triage_atto) ---------------------------

/**
 * Sospensione feriale dei termini processuali: 1–31 agosto. Si applica ai
 * termini di impugnazione (ricorso alla CGT), NON ai termini di pagamento
 * amministrativi.
 */
export const SOSPENSIONE_FERIALE = costante(
  { inizio: "08-01", fine: "08-31" } as const,
  "art. 1 L. 742/1969 (ridotta da D.L. 132/2014)",
  "2026-07-07",
);

/**
 * Sospensione estiva dei termini di pagamento delle somme da controlli
 * automatizzati/formali (avvisi bonari): 1/8–4/9; se l'atto è notificato in
 * agosto il termine riparte dal 5/9. NB: le rate successive di una rateazione
 * già avviata NON sono sospese.
 */
export const SOSPENSIONE_BONARI = costante(
  { inizio: "08-01", fine: "09-04" } as const,
  "art. 7-quater c.17 D.L. 193/2016",
  "2026-07-07",
);

/** Termine ordinario per il ricorso tributario. */
export const TERMINE_RICORSO_GG = costante(
  60,
  "art. 21 D.Lgs. 546/1992",
  "2026-07-07",
);

/**
 * Sospensione del termine di ricorso per istanza di accertamento con adesione:
 * +90 giorni, automatica alla presentazione, cessa solo con rinuncia formale.
 */
export const ADESIONE_SOSPENSIONE_GG = costante(
  90,
  "art. 6 c.3 D.Lgs. 218/1997; Cass. 23828/2025",
  "2026-07-07",
);

/**
 * Avviso bonario (36-bis/36-ter): pagamento agevolato entro 60 giorni (90 se
 * l'esito è reso disponibile in via telematica all'intermediario). Termini
 * RADDOPPIATI dal correttivo D.Lgs. 108/2024 (erano 30/60) per le
 * comunicazioni elaborate dal 1/1/2025.
 */
export const TERMINE_BONARIO_GG = costante(
  60,
  "art. 2-bis c.3 D.L. 203/2005 come modificato da D.Lgs. 108/2024 (comunicazioni elaborate dal 1/1/2025)",
  "2026-07-07",
);
export const TERMINE_BONARIO_TELEMATICO_GG = costante(
  90,
  "art. 2-bis c.3 D.L. 203/2005 come modificato da D.Lgs. 108/2024 (comunicazioni elaborate dal 1/1/2025)",
  "2026-07-07",
);
/** Riduzione sanzione per definizione dell'avviso da controllo AUTOMATICO (36-bis). */
export const RIDUZIONE_SANZIONE_BONARIO = costante(
  1 / 3,
  "art. 2 D.Lgs. 462/1997 (controllo automatizzato 36-bis)",
  "2026-07-07",
);
/** Riduzione sanzione per definizione dell'esito da controllo FORMALE (36-ter): 2/3, non 1/3. */
export const RIDUZIONE_SANZIONE_CONTROLLO_FORMALE = costante(
  2 / 3,
  "art. 3 D.Lgs. 462/1997 (controllo formale 36-ter)",
  "2026-07-07",
);
/**
 * Rateazione degli avvisi bonari: fino a 20 rate trimestrali di pari importo,
 * senza soglia minima (la L. 197/2022 ha tolto la soglia dei €5.000 introdotta
 * dalla L. 234/2021).
 */
export const RATE_BONARIO_MAX = costante(
  20,
  "art. 3-bis D.Lgs. 462/1997, come esteso dalla L. 197/2022 (Legge di Bilancio 2023)",
  "2026-07-07",
);

/** Cartella di pagamento: pagamento (o ricorso) entro 60 gg dalla notifica. */
export const TERMINE_CARTELLA_GG = costante(
  60,
  "art. 25 DPR 602/1973",
  "2026-07-07",
);

/**
 * Rateizzazione AdE-Riscossione su semplice richiesta (debiti ≤ €120.000):
 * il numero massimo di rate mensili cresce per scaglioni temporali in base
 * all'anno di presentazione dell'ISTANZA (D.Lgs. 110/2024) — tabella
 * tempo-indicizzata, consultata via `rateAderSemplice()`.
 */
export const RATE_ADER_SEMPLICE: readonly VoceVigente<number>[] = [
  {
    valore: 84,
    vigenzaDa: "2025-01-01",
    vigenzaA: "2026-12-31",
    fonte: "D.Lgs. 110/2024; agenziaentrateriscossione.gov.it — la rateizzazione",
    verificatoIl: "2026-07-07",
  },
  {
    valore: 96,
    vigenzaDa: "2027-01-01",
    vigenzaA: "2028-12-31",
    fonte: "D.Lgs. 110/2024; agenziaentrateriscossione.gov.it — la rateizzazione",
    verificatoIl: "2026-07-07",
  },
  {
    valore: 108,
    vigenzaDa: "2029-01-01",
    fonte: "D.Lgs. 110/2024; agenziaentrateriscossione.gov.it — la rateizzazione",
    verificatoIl: "2026-07-07",
  },
];

/** Rate massime AdER su semplice richiesta, per data di presentazione dell'istanza. */
export function rateAderSemplice(dataIstanzaISO: string): Lookup<number> {
  return lookupVigente(
    "rate AdER su semplice richiesta",
    RATE_ADER_SEMPLICE,
    dataIstanzaISO,
  );
}

export const SOGLIA_ADER_SEMPLICE = costante(
  120_000,
  "D.Lgs. 110/2024; agenziaentrateriscossione.gov.it",
  "2026-07-07",
);

/** Intimazione di pagamento: 5 giorni. */
export const TERMINE_INTIMAZIONE_GG = costante(
  5,
  "art. 50 DPR 602/1973",
  "2026-07-07",
);

/** Preavviso di fermo amministrativo: 30 giorni. */
export const TERMINE_PREAVVISO_FERMO_GG = costante(
  30,
  "art. 86 DPR 602/1973",
  "2026-07-07",
);

/**
 * Acquiescenza all'avviso di accertamento: pagamento con sanzioni ridotte a
 * 1/3 entro il termine di ricorso.
 */
export const RIDUZIONE_SANZIONE_ACQUIESCENZA = costante(
  1 / 3,
  "art. 15 D.Lgs. 218/1997",
  "2026-07-07",
);

// --- Detrazione spese sanitarie (art. 15 c.1 lett. c TUIR) ----------------

/**
 * Aliquota della detrazione IRPEF per le spese sanitarie: 19% sull'eccedenza
 * della franchigia. NB: le spese sanitarie sono ESCLUSE sia dalla riduzione per
 * reddito dell'art. 15 c.3-bis TUIR (120k/240k), sia dal nuovo tetto agli oneri
 * dell'art. 16-ter TUIR (L. 207/2024, redditi > 75k): restano detraibili al 19%
 * a qualunque livello di reddito.
 */
export const DETRAZIONE_SANITARIE_ALIQUOTA = costante(
  0.19, // 19%
  "art. 15 c.1 TUIR; agenziaentrate.gov.it — spese sanitarie detraibili (esclusione dai tetti reddito: art. 15 c.3-bis e art. 16-ter TUIR, Circ. AdE 6/E del 29/5/2025)",
  "2026-07-07",
);

/**
 * Franchigia sulle spese sanitarie: la detrazione spetta sulla parte che eccede
 * €129,11. Unica e cumulativa per contribuente + familiari a carico (righi E1
 * col. 1 e col. 2). Non si applica ai righi E3/E4/E5 (disabili).
 */
export const FRANCHIGIA_SANITARIE = costante(
  129.11,
  "art. 15 c.1 lett. c TUIR; istruzioni Modello 730 — rigo E1",
  "2026-07-07",
);

/**
 * Soglia oltre la quale la detrazione delle spese dei righi E1+E2+E3 può essere
 * ripartita in 4 quote annuali di pari importo (opzione in dichiarazione; le
 * quote residue vanno nel rigo E6 negli anni successivi).
 */
export const SOGLIA_RATEIZZAZIONE_SANITARIE = costante(
  15_493.71,
  "art. 15 c.1 TUIR; istruzioni Modello 730 — rateizzazione righi E1/E2/E3",
  "2026-07-07",
);
/** Numero di quote annuali della rateizzazione della detrazione sanitaria. */
export const N_RATE_DETRAZIONE_SANITARIE = costante(
  4,
  "art. 15 c.1 TUIR; istruzioni Modello 730 — rigo E6",
  "2026-07-07",
);

/**
 * Tetto di spesa per il rigo E2 (spese per familiari NON a carico affetti da
 * patologie esenti): massimo €6.197,48 annui, e solo per la quota che non ha
 * trovato capienza nell'IRPEF del familiare malato (dato esterno da acquisire).
 */
export const CAP_E2_PATOLOGIE_ESENTI = costante(
  6_197.48,
  "istruzioni Modello 730 — rigo E2 (familiari non a carico, patologie esenti)",
  "2026-07-07",
);

/**
 * Tetto di spesa per il rigo E4 (acquisto veicoli per persone con disabilità):
 * detrazione 19% su un massimo di €18.075,99, una sola volta in 4 anni.
 */
export const CAP_E4_VEICOLI_DISABILI = costante(
  18_075.99,
  "istruzioni Modello 730 — rigo E4 (veicoli per persone con disabilità)",
  "2026-07-07",
);

// --- Disclaimer condiviso, in coda a ogni output di calcolo ---------------

export const DISCLAIMER_BOZZA =
  "⚠️ BOZZA da verificare — calcolo automatico basato su regole pubbliche " +
  "(fonti citate per ogni assunzione) e sulle assunzioni sopra indicate. " +
  "Verificare importi, percentuali e codici prima dell'uso: la decisione e la " +
  "responsabilità restano del professionista.";
