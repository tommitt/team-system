/**
 * Costanti fiscali per il cuneo del 20 luglio 2026.
 *
 * ⚠️ PESO LEGALE. Ogni valore qui è una regola pubblica con conseguenze
 * economiche per il contribuente. Sono centralizzate in un solo file, ciascuna
 * con la sua fonte, così il professionista può verificarle a colpo d'occhio e
 * il resto del motore resta pura aritmetica testabile. Gli output dei tool
 * espongono sempre queste assunzioni come "DA VERIFICARE": la decisione resta
 * umana (vedi `catalogo-skills-tools.md`, principio human-in-the-loop).
 *
 * Fonte primaria delle date: D.L. 22 maggio 2026, n. 89, art. 6 (proroga
 * saldo 2025 + 1° acconto 2026 al 20/7/2026 per soggetti ISA, forfettari,
 * regime di vantaggio, soci di trasparenza — verificata su fonti live 2026).
 */

// --- Scadenze del cuneo (D.L. 89/2026) ------------------------------------

/** Saldo 2025 + 1ª rata acconto 2026, senza maggiorazione (proroga). */
export const SCADENZA_SALDO_ACCONTO = "2026-07-20";
/** Seconda finestra: stessi importi con maggiorazione dello 0,80%. */
export const SCADENZA_SALDO_ACCONTO_MAGGIORATA = "2026-08-20";
/** Seconda rata di acconto 2026. */
export const SCADENZA_SECONDO_ACCONTO = "2026-11-30";
/** Ultima rata utile per la rateizzazione dei versamenti da dichiarazione. */
export const SCADENZA_ULTIMA_RATA = "2026-12-16";

/** Maggiorazione per chi paga nella finestra 21/7–20/8 (art. 17 c.2 DPR 435/2001). */
export const MAGGIORAZIONE_DIFFERIMENTO = 0.008; // 0,80%

// --- Acconto (metodo storico) ---------------------------------------------

/**
 * Percentuale dell'acconto sul rigo "differenza" del quadro (RN34 per le PF).
 * 100% per IRPEF/imposta sostitutiva forfettari/cedolare secca dal 2018.
 * DA VERIFICARE per casi speciali (es. alcune addizionali).
 */
export const ACCONTO_PERCENTUALE = 1.0; // 100%

/** Sotto questa soglia l'acconto non è dovuto (RN34 ≤ €51,65). */
export const ACCONTO_SOGLIA_MINIMA = 51.65;

/**
 * Soglia oltre la quale l'acconto ordinario si versa in due rate (40%/60%);
 * sotto, in unica soluzione a novembre. (Prassi AdE su art. 17 DPR 435/2001.)
 * NB: per i soggetti ISA e forfettari le due rate sono di pari importo
 * (50%/50%) — vedi `SPLIT_ACCONTO_*` e il parametro `regime`.
 */
export const ACCONTO_SOGLIA_RATEIZZO = 257.52;

/** Split ordinario dell'acconto in due rate. */
export const SPLIT_ACCONTO_ORDINARIO = { prima: 0.4, seconda: 0.6 } as const;
/**
 * Split per soggetti ISA e forfettari: due rate di pari importo
 * (art. 12-quinquies D.L. 34/2019). DA VERIFICARE la perdurante vigenza 2026.
 */
export const SPLIT_ACCONTO_ISA = { prima: 0.5, seconda: 0.5 } as const;

// --- Acconto (metodo previsionale) ----------------------------------------

/**
 * Tolleranza sul previsionale usata come SOGLIA DI RISCHIO nel prospetto:
 * se il versato scende sotto (imposta finale × (1 − tolleranza)) il tool
 * segnala il rischio di sanzione. NB: è un'euristica di rischio esposta come
 * assunzione, non una franchigia di legge — il professionista la conferma.
 */
export const PREVISIONALE_TOLLERANZA = 0.2; // 20%

/**
 * Sanzione base per insufficiente/omesso versamento (art. 13 D.Lgs. 471/1997).
 * Ridotta dal 30% al 25% per violazioni dal 1/9/2024 (riforma D.Lgs. 87/2024);
 * per il 2026 il default è 25%. Sovrascrivibile. DA VERIFICARE per il caso.
 */
export const SANZIONE_OMESSO_VERSAMENTO = 0.25; // 25%

// --- Rateizzazione (art. 20 D.Lgs. 241/1997) ------------------------------

/** Numero massimo di rate per i versamenti da dichiarazione (ultima al 16/12). */
export const RATE_MAX = 7;
/**
 * Interesse di rateazione: 4% annuo, applicato ~0,33% al mese sulle rate
 * successive alla prima (la prima non porta interessi). Il modello qui è quello
 * delle tabelle AdE: interesse rata_i = quota capitale × 0,33% × (i − 1).
 * DA VERIFICARE il conteggio esatto dei giorni per il caso concreto.
 */
export const INTERESSE_RATEIZZO_MENSILE = 0.0033; // 0,33% (~4% annuo)

// --- Ravvedimento operoso (art. 13 D.Lgs. 472/1997) -----------------------

/**
 * Tasso legale annuo per il calcolo degli interessi da ravvedimento.
 * ⚠️ DA VERIFICARE: cambia ogni anno con DM MEF. Valore di default indicativo,
 * da sostituire col tasso vigente nel periodo del ritardo (o pro-rata se il
 * ritardo attraversa più anni con tassi diversi).
 */
export const TASSO_LEGALE_ANNUO = 0.02; // 2% — placeholder da confermare

/**
 * Sanzione ridotta EFFETTIVA per ravvedimento su omesso/insufficiente
 * versamento — violazioni dal 1/9/2024 (base 25%, riforma D.Lgs. 87/2024).
 * ⚠️ DA VERIFICARE ogni valore: sono le riduzioni comunemente citate, da
 * confermare sulla norma. `sprint` è una quota giornaliera; gli altri sono
 * percentuali fisse sull'imposta.
 */
export const SCAGLIONI_RAVVEDIMENTO = [
  {
    chiave: "sprint",
    entroGiorni: 14,
    perGiorno: 0.000833, // ~0,0833%/giorno
    descrizione: "entro 14 giorni (ravvedimento sprint, per giorno)",
  },
  {
    chiave: "breve",
    entroGiorni: 30,
    percentuale: 0.0125, // 1/10 del 12,5%
    descrizione: "entro 30 giorni (1/10 di 12,5%)",
  },
  {
    chiave: "trimestrale",
    entroGiorni: 90,
    percentuale: 0.0139, // 1/9 del 12,5%
    descrizione: "entro 90 giorni (1/9 di 12,5%)",
  },
  {
    chiave: "annuale",
    entroGiorni: 365,
    percentuale: 0.03125, // 1/8 del 25%
    descrizione: "entro 1 anno / termine dichiarazione (1/8 di 25%)",
  },
  {
    chiave: "biennale",
    entroGiorni: 730,
    percentuale: 0.035714, // 1/7 del 25%
    descrizione: "entro 2 anni (1/7 di 25%)",
  },
  {
    chiave: "lungo",
    entroGiorni: null,
    percentuale: 0.041667, // 1/6 del 25%
    descrizione: "oltre 2 anni (1/6 di 25%)",
  },
] as const;

// --- Disclaimer condiviso, in coda a ogni output di calcolo ---------------

export const DISCLAIMER_BOZZA =
  "⚠️ BOZZA da verificare — calcolo automatico basato su regole pubbliche " +
  "(D.L. 89/2026 e norme citate) e sulle assunzioni sopra indicate. Verificare " +
  "importi, percentuali e codici prima dell'uso: la decisione e la " +
  "responsabilità restano del professionista.";
