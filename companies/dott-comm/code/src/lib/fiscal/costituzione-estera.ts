/**
 * Costituzione di una S.r.l. italiana interamente controllata da una società USA
 * — dominio puro (checklist, valutazione startup innovativa, tracce di bozza).
 *
 * ⚠️ FONTI E PESO LEGALE. Ogni voce porta la sua `fonte` e un flag `verifica`:
 * `verificato` = riscontrata su fonte ufficiale/primaria nella ricerca del
 * 2026-07-10; `da_verificare` = solo fonti secondarie o area in movimento (es.
 * registro titolari effettivi, prassi notarile, aliquota IRAP regionale). Il
 * tool DEVE esporre i `da_verificare` nell'output: ogni cosa qui è materiale per
 * una BOZZA, non consulenza legale/fiscale — la responsabilità resta del
 * professionista, e i passaggi notarili/fiscali vanno confermati con notaio e
 * consulente.
 *
 * Punto chiave verificato: la proprietà corporate estera NON è un ostacolo. Il
 * requisito "persone fisiche in maggioranza" (ex art. 25 c.2 lett. a D.L.
 * 179/2012) è stato ABROGATO dal D.L. 76/2013 (conv. L. 99/2013): una S.r.l.
 * interamente USA-owned può essere anche startup innovativa. Le esclusioni vere
 * sono pratiche (divieto di distribuire utili, asticella d'innovazione, MPMI).
 */
import {
  STARTUP_DURATA_MAX_MESI,
  STARTUP_SOGLIA_RS,
} from "./constants";

export type FaseChiave =
  | "preliminari"
  | "documenti_usa"
  | "identificativi"
  | "atto"
  | "post"
  | "fiscale";

export type Attore =
  | "studio"
  | "cliente"
  | "parent_usa"
  | "notaio"
  | "banca"
  | "agenzia_entrate";

export type Verifica = "verificato" | "da_verificare";

export type VoceCostituzione = {
  chiave: string;
  label: string;
  fase: FaseChiave;
  aCarico: Attore;
  /** Azione concreta, già ancorata alla norma. */
  nota: string;
  fonte: string;
  verifica: Verifica;
  /**
   * true se è un DOCUMENTO che la capogruppo USA deve produrre e che va
   * apostillato + tradotto (traduzione giurata) per l'uso davanti al notaio e al
   * Registro Imprese.
   */
  documentoDaApostillare?: boolean;
};

export const FASI: readonly { chiave: FaseChiave; titolo: string }[] = [
  { chiave: "preliminari", titolo: "FASE 0 — Decisioni preliminari (studio + cliente)" },
  {
    chiave: "documenti_usa",
    titolo: "FASE A — Documenti dalla capogruppo USA (apostille + traduzione giurata)",
  },
  {
    chiave: "identificativi",
    titolo: "FASE B — Identificativi italiani (codice fiscale, firma digitale)",
  },
  { chiave: "atto", titolo: "FASE C — Atto notarile e costituzione" },
  { chiave: "post", titolo: "FASE D — Adempimenti post-costituzione" },
  {
    chiave: "fiscale",
    titolo: "FASE E — Impostazione fiscale cross-border (consulenza)",
  },
] as const;

export const CHECKLIST: readonly VoceCostituzione[] = [
  // --- FASE 0 — Decisioni preliminari --------------------------------------
  {
    chiave: "forma_giuridica",
    label: "Forma giuridica: S.r.l. ordinaria (la S.r.l.s. è esclusa)",
    fase: "preliminari",
    aCarico: "studio",
    nota:
      "Usare la S.r.l. ORDINARIA. La S.r.l. semplificata (S.r.l.s.) NON è utilizzabile: " +
      "l'art. 2463-bis c.c. la riserva alle sole persone fisiche, quindi un socio unico " +
      "persona giuridica estera è escluso.",
    fonte: "art. 2463-bis c.c.",
    verifica: "verificato",
  },
  {
    chiave: "capitale",
    label: "Capitale sociale (minimo €10.000; ammesso €1–€9.999,99 con vincoli)",
    fase: "preliminari",
    aCarico: "studio",
    nota:
      "Fissare il capitale: minimo €10.000. È ammesso un capitale ridotto da €1 a €9.999,99 " +
      "ma solo con conferimenti in denaro, versati per intero, e obbligo di accantonare a " +
      "riserva legale 1/5 degli utili annui finché capitale + riserva raggiungono €10.000.",
    fonte: "art. 2463 commi 1, 4-5 c.c.",
    verifica: "verificato",
  },
  {
    chiave: "versamento_integrale",
    label: "Versamento capitale: 100% all'atto (socio unico)",
    fase: "preliminari",
    aCarico: "cliente",
    nota:
      "Socio unico = costituzione con atto unilaterale: il capitale in denaro va versato PER " +
      "INTERO (100%) al momento dell'atto, non il 25%. Può essere versato all'organo " +
      "amministrativo o su conto escrow del notaio — non serve un conto della società prima " +
      "dell'iscrizione.",
    fonte: "art. 2464 c.4 c.c.; Massima 148 Consiglio Notarile di Milano",
    verifica: "verificato",
  },
  {
    chiave: "reciprocita",
    label: "Condizione di reciprocità Italia-USA",
    fase: "preliminari",
    aCarico: "studio",
    nota:
      "Verificare la condizione di reciprocità (art. 16 preleggi): per gli USA è soddisfatta " +
      "grazie al Trattato di amicizia, commercio e navigazione Italia-USA (L. 385/1949) e " +
      "all'adesione WTO. Il notaio la riscontra comunque sull'elenco Paesi del MAECI al " +
      "momento dell'atto.",
    fonte: "art. 16 disp. prel. c.c.; L. 385/1949 (Trattato FCN Italia-USA); MAECI",
    verifica: "da_verificare",
  },
  {
    chiave: "oggetto_ateco",
    label: "Oggetto sociale e codice ATECO",
    fase: "preliminari",
    aCarico: "studio",
    nota:
      "Definire oggetto sociale e codice ATECO (classificazione ATECO 2025 in vigore). Serve " +
      "per ComUnica e per l'eventuale valutazione di startup innovativa (oggetto innovativo).",
    fonte: "classificazione ATECO 2025 (ISTAT/Agenzia delle Entrate)",
    verifica: "da_verificare",
  },
  {
    chiave: "governance",
    label: "Governance e sede legale (amministratore anche non residente)",
    fase: "preliminari",
    aCarico: "studio",
    nota:
      "Definire amministratore unico o CdA e sede legale. Un amministratore non residente è " +
      "ammesso, ma richiede codice fiscale italiano (Fase B) e attiva l'obbligo di PEC " +
      "personale (Fase D).",
    fonte: "art. 2475 c.c.; Circolare MISE 3668/C (CF obbligatorio soggetti esteri)",
    verifica: "verificato",
  },

  // --- FASE A — Documenti dalla capogruppo USA -----------------------------
  {
    chiave: "certificate_incorporation",
    label: "Certificate of Incorporation della parent USA",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    documentoDaApostillare: true,
    nota:
      "Prova l'esistenza della capogruppo. Apostille del Secretary of State dello Stato USA " +
      "di costituzione + traduzione giurata (asseverata) in italiano.",
    fonte: "Conv. dell'Aia 5/10/1961 (USA e Italia aderenti); Ambasciata d'Italia a Washington",
    verifica: "verificato",
  },
  {
    chiave: "good_standing",
    label: "Certificate of Good Standing / certificato di vigenza",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    documentoDaApostillare: true,
    nota:
      "Prova che la capogruppo è attiva e in regola. Apostille + traduzione giurata. In " +
      "alcuni Stati USA (es. Delaware) è un certificato distinto dal Certificate of " +
      "Incorporation.",
    fonte: "prassi notarile per socio persona giuridica estera; Conv. dell'Aia 1961",
    verifica: "verificato",
  },
  {
    chiave: "bylaws",
    label: "Bylaws / statuto della parent",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    documentoDaApostillare: true,
    nota:
      "Governance e poteri di firma della capogruppo. Apostille + traduzione giurata.",
    fonte: "prassi notarile (verifica poteri del soggetto estero)",
    verifica: "verificato",
  },
  {
    chiave: "board_resolution",
    label: "Board resolution che autorizza la costituzione e nomina il firmatario",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    documentoDaApostillare: true,
    nota:
      "Delibera del CdA della parent che decide la costituzione della controllata italiana e " +
      "nomina la persona autorizzata a firmare. Apostille + traduzione giurata.",
    fonte: "prassi notarile; Notaio M. Ferraro (documenti societari esteri)",
    verifica: "verificato",
  },
  {
    chiave: "procura",
    label: "Procura speciale (se il firmatario non interviene di persona)",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    documentoDaApostillare: true,
    nota:
      "Se si firma da remoto serve una procura notarile: (a) davanti a notary public USA + " +
      "apostille + traduzione giurata, oppure (b) procura consolare presso il Consolato " +
      "italiano negli USA (già in forma italiana, senza apostille né traduzione).",
    fonte: "Notai Cosenza/Del Monte; orientamenti Notai Triveneto (procura estera)",
    verifica: "verificato",
  },
  {
    chiave: "passaporto_firmatario",
    label: "Passaporto del firmatario che rappresenta la parent",
    fase: "documenti_usa",
    aCarico: "parent_usa",
    nota:
      "Documento d'identità (passaporto) valido del firmatario, per l'identificazione " +
      "notarile. (L'EIN della parent NON è un requisito italiano: l'identificativo fiscale " +
      "usato è il codice fiscale — Fase B.)",
    fonte: "Studio notarile M2C (identificazione soci stranieri)",
    verifica: "verificato",
  },

  // --- FASE B — Identificativi italiani ------------------------------------
  {
    chiave: "cf_parent",
    label: "Codice fiscale italiano della capogruppo USA (socio)",
    fase: "identificativi",
    aCarico: "studio",
    nota:
      "Richiedere il codice fiscale della parent con modello AA5/6 all'Agenzia delle Entrate " +
      "— Centro Operativo di Pescara (canale non residenti), allegando la documentazione di " +
      "esistenza dell'ente. Necessario per indicare il socio nell'atto e in ComUnica.",
    fonte: "modello AA5/6 Agenzia delle Entrate; CCIAA Modena (Circ. 3668/C)",
    verifica: "verificato",
  },
  {
    chiave: "cf_amministratori",
    label: "Codice fiscale italiano degli amministratori non residenti",
    fase: "identificativi",
    aCarico: "studio",
    nota:
      "Ogni amministratore non residente deve avere il codice fiscale italiano: è " +
      "obbligatorio per l'iscrizione al Registro Imprese/REA. Modello AA4/8, tramite delegato " +
      "in Italia o Consolato italiano. Prerequisito per la nomina e per la firma digitale.",
    fonte: "Circolare MISE 3668/C (CF obbligatorio dal 1/4/2014); Agenzia delle Entrate",
    verifica: "verificato",
  },
  {
    chiave: "firma_digitale",
    label: "Firma digitale per l'amministratore (o delega al notaio/intermediario)",
    fase: "identificativi",
    aCarico: "cliente",
    nota:
      "Serve una firma digitale italiana per chi sottoscrive ComUnica/adempimenti telematici " +
      "(in alternativa firma il notaio/intermediario). Blocco pratico per un amministratore " +
      "estero: richiede prima il CF italiano e il riconoscimento; SPID/CIE di norma NON " +
      "disponibili per stranieri non residenti → via CA con video-riconoscimento su passaporto.",
    fonte: "AgID (SPID per l'estero limitato ai cittadini italiani); prassi CA firma digitale",
    verifica: "da_verificare",
  },

  // --- FASE C — Atto notarile e costituzione -------------------------------
  {
    chiave: "atto_notarile",
    label: "Atto costitutivo per atto pubblico notarile",
    fase: "atto",
    aCarico: "notaio",
    nota:
      "L'atto costitutivo va redatto per ATTO PUBBLICO notarile (forma ad substantiam). " +
      "Disponibile anche in videoconferenza sulla piattaforma del Notariato (D.lgs. " +
      "183/2021), usabile con parti all'estero MA solo per conferimenti in DENARO: un " +
      "conferimento in natura impone l'atto in presenza.",
    fonte: "art. 2463 c.c.; D.lgs. 183/2021 (costituzione online)",
    verifica: "verificato",
  },
  {
    chiave: "deposito_ri",
    label: "Deposito al Registro Imprese entro 10 giorni",
    fase: "atto",
    aCarico: "notaio",
    nota:
      "Il notaio deposita l'atto al Registro Imprese entro 10 GIORNI (termine dimezzato da 20 " +
      "a 10 dalla L. 12/2019). La società acquista personalità giuridica SOLO con l'iscrizione.",
    fonte: "art. 2330 c.c. (mod. L. 12/2019)",
    verifica: "verificato",
  },
  {
    chiave: "pec_societa",
    label: "PEC / domicilio digitale della società",
    fase: "atto",
    aCarico: "studio",
    nota:
      "Indicare la PEC della società nella domanda di iscrizione al Registro Imprese: senza, " +
      "l'iscrizione è sospesa. La registrazione è gratuita (esente bollo e diritti).",
    fonte: "art. 16 c.6 D.L. 185/2008 (conv. L. 2/2009); Unioncamere",
    verifica: "da_verificare",
  },

  // --- FASE D — Adempimenti post-costituzione ------------------------------
  {
    chiave: "partita_iva",
    label: "Partita IVA (dentro ComUnica, non AA7/10 separato)",
    fase: "post",
    aCarico: "studio",
    nota:
      "Per i soggetti iscritti al Registro Imprese la P.IVA si apre DENTRO la Comunicazione " +
      "Unica (ComUnica), che trasmette contestualmente Registro Imprese, Agenzia delle " +
      "Entrate (contenuto del modello AA7/10), INPS e INAIL — non con un AA7/10 a parte.",
    fonte: "Agenzia delle Entrate — AA7/10, quando utilizzare ComUnica",
    verifica: "verificato",
  },
  {
    chiave: "pec_amministratore",
    label: "PEC personale dell'amministratore (distinta da quella della società)",
    fase: "post",
    aCarico: "studio",
    nota:
      "Comunicare al Registro Imprese la PEC PERSONALE dell'amministratore, distinta da quella " +
      "della società (obbligo introdotto dall'art. 1 c.860 L. 207/2024, mod. D.L. 159/2025; " +
      "termine 31/12/2025). L'amministratore unico, anche non residente, è nel perimetro.",
    fonte: "art. 1 c.860 L. 207/2024 (mod. D.L. 159/2025); MIMIT",
    verifica: "da_verificare",
  },
  {
    chiave: "titolare_effettivo",
    label: "Comunicazione titolare effettivo (registro sospeso ma in riattivazione)",
    fase: "post",
    aCarico: "studio",
    nota:
      "Comunicazione del titolare effettivo al Registro Imprese entro 30 gg dall'iscrizione " +
      "(via DIRE/Telemaco). ATTENZIONE — area in movimento: al 2026-07-10 il registro è ancora " +
      "formalmente SOSPESO (ordinanza Consiglio di Stato); la Corte UE (21/5/2026, cause " +
      "C-684/24 e C-685/24) ha dato il via libera e la riattivazione è imminente ma non ancora " +
      "perfezionata. Monitorare gli avvisi MIMIT/Unioncamere per il nuovo termine effettivo.",
    fonte: "DM 55/2022 art. 3; CGUE 21/5/2026 C-684/24 e C-685/24; note MIMIT/Unioncamere",
    verifica: "da_verificare",
  },
  {
    chiave: "titolare_effettivo_catena",
    label: "Individuazione del titolare effettivo lungo la catena USA",
    fase: "post",
    aCarico: "studio",
    nota:
      "Risalire la catena: il titolare effettivo è la persona fisica che detiene >25% della " +
      "parent USA (quindi, indirettamente, della S.r.l.); se nessuno lo detiene in modo " +
      "univoco, sono gli amministratori della S.r.l. (criterio residuale).",
    fonte: "art. 20 D.Lgs. 231/2007; FAQ MEF Dipartimento del Tesoro",
    verifica: "verificato",
  },
  {
    chiave: "conto_operativo",
    label: "Conto corrente operativo della società (lo step più lento)",
    fase: "post",
    aCarico: "banca",
    nota:
      "Aprire il conto OPERATIVO della società: tipicamente il passaggio più lento. KYC / " +
      "adeguata verifica rafforzata per una società interamente controllata da soggetto estero " +
      "(identificazione di società, parent e titolare effettivo). NB: non serve per depositare " +
      "il capitale (già versato all'atto), ma serve per operare — avviarlo presto.",
    fonte: "obblighi di adeguata verifica D.Lgs. 231/2007 (bottleneck: fonti secondarie)",
    verifica: "da_verificare",
  },
  {
    chiave: "adeguata_verifica_studio",
    label: "Adeguata verifica antiriciclaggio dello studio sul nuovo cliente",
    fase: "post",
    aCarico: "studio",
    nota:
      "Al conferimento dell'incarico: identificazione del cliente + del titolare effettivo + " +
      "scopo e natura dell'incarico. Struttura cross-border a socio estero → profilo " +
      "tipicamente RAFFORZATO. Riferimento: Regole Tecniche CNDCEC (agg. gennaio 2025).",
    fonte: "artt. 17-19 D.Lgs. 231/2007; Regole Tecniche CNDCEC (gennaio 2025)",
    verifica: "verificato",
  },

  // --- FASE E — Impostazione fiscale cross-border (consulenza) --------------
  {
    chiave: "ritenuta_dividendi",
    label: "Ritenuta sui dividendi verso la parent USA (5% / 15%, non 0%)",
    fase: "fiscale",
    aCarico: "studio",
    nota:
      "Dividendi alla parent USA: ritenuta convenzionale del 5% se la parent detiene ≥25% dei " +
      "voti da ≥12 mesi, altrimenti 15% — la Convenzione Italia-USA (firmata 1999, in vigore " +
      "dal 2009) NON prevede lo 0%. Senza trattato la ritenuta domestica è 26%; la direttiva " +
      "madre-figlia UE NON si applica (parent extra-UE). Servono Form 6166 e prova del " +
      "beneficiario effettivo.",
    fonte: "Conv. Italia-USA art. 10 (L. 20/2009); art. 27 DPR 600/1973",
    verifica: "verificato",
  },
  {
    chiave: "ritenute_interessi_royalties",
    label: "Ritenute su interessi (max 10%) e royalties (0/5/8%)",
    fase: "fiscale",
    aCarico: "studio",
    nota:
      "Interessi verso la parent: massimo 10% alla fonte (art. 11). Royalties: 0% per diritti " +
      "d'autore, 5% per software e attrezzature industriali/commerciali/scientifiche, 8% negli " +
      "altri casi (brevetti, marchi, know-how) (art. 12).",
    fonte: "Conv. Italia-USA artt. 11-12 (L. 20/2009)",
    verifica: "verificato",
  },
  {
    chiave: "transfer_pricing",
    label: "Transfer pricing sulle operazioni infragruppo Italia-USA",
    fase: "fiscale",
    aCarico: "studio",
    nota:
      "Le operazioni infragruppo con la parent USA vanno a valore di libera concorrenza. " +
      "Predisporre Master File + Documentazione Nazionale (secondo il Provvedimento AdE del " +
      "23/11/2020) per attivare la penalty protection sulle eventuali rettifiche.",
    fonte: "art. 110 c.7 TUIR; D.M. 14/5/2018; Provv. AdE 23/11/2020",
    verifica: "verificato",
  },
  {
    chiave: "stabile_organizzazione",
    label: "Rischio di stabile organizzazione occulta / esterovestizione",
    fase: "fiscale",
    aCarico: "studio",
    nota:
      "Presidiare il rischio che la parent USA sia ritenuta avere una stabile organizzazione " +
      "occulta in Italia (o profili di esterovestizione): la governance concreta — dove si " +
      "assumono le decisioni, il grado di dipendenza operativa dalla parent — è decisiva. Da " +
      "impostare correttamente fin dall'inizio.",
    fonte: "art. 162 TUIR (definizione di stabile organizzazione)",
    verifica: "verificato",
  },
  {
    chiave: "ires_irap",
    label: "IRES 24% + IRAP 3,9% base sui redditi della S.r.l.",
    fase: "fiscale",
    aCarico: "studio",
    nota:
      "La S.r.l. sconta IRES al 24% e IRAP al 3,9% base (l'aliquota IRAP regionale può " +
      "divergere — verificarla). L'IRES premiale al 20% valeva solo per il 2025 e non è stata " +
      "prorogata.",
    fonte: "scheda IRES Agenzia delle Entrate; IRAP base 3,9% (aliquota regionale da verificare)",
    verifica: "da_verificare",
  },
] as const;

export function vociDellaFase(fase: FaseChiave): VoceCostituzione[] {
  return CHECKLIST.filter((v) => v.fase === fase);
}

// --- Valutazione startup innovativa --------------------------------------

export type CriterioInnovazione = "rs" | "personale" | "privativa" | "nessuno";

export type StartupInput = {
  /** true = la controllata distribuirà utili al parent (esclusione). */
  distribuiraUtili?: boolean;
  /** oggetto sociale innovativo ad alto valore tecnologico (requisito). */
  oggettoInnovativo?: boolean;
  /** micro/piccola/media impresa ex Racc. 2003/361/CE (requisito, L. 193/2024). */
  eMpmi?: boolean;
  /** true = attività prevalente di agenzia/consulenza (esclusione, L. 193/2024). */
  attivitaPrevalenteConsulenza?: boolean;
  /** mesi trascorsi dalla costituzione (tetto anagrafico 60). */
  mesiDallaCostituzione?: number;
  /** true = nata da fusione/scissione/cessione d'azienda (esclusione). */
  daOperazioneStraordinaria?: boolean;
  /** quale dei tre criteri alternativi di innovazione è soddisfatto. */
  criterioInnovazione?: CriterioInnovazione;
};

export type StartupEsito = {
  /** true = ammissibile; false = esclusa; "da_valutare" = mancano conferme. */
  ammissibile: boolean | "da_valutare";
  /** motivi che escludono lo status (hard fail). */
  bloccanti: string[];
  /** informazioni ancora da confermare prima di poter concludere. */
  daConfermare: string[];
  /** note sempre valide (via notarile, permanenza, proprietà estera ok). */
  note: string[];
};

/**
 * Valuta l'ammissibilità allo status di startup innovativa per una S.r.l.
 * USA-owned. La proprietà corporate estera NON è un ostacolo (ex lett. a
 * abrogata): il gate sono le esclusioni pratiche. Restituisce sempre le note
 * strutturali (via notarile obbligatoria, permanenza 3+2→9 anni).
 */
export function valutaStartupInnovativa(input: StartupInput): StartupEsito {
  const bloccanti: string[] = [];
  const daConfermare: string[] = [];

  if (input.distribuiraUtili === true) {
    bloccanti.push(
      "Divieto assoluto di distribuzione di utili: se la controllata distribuirà dividendi al " +
        "parent USA (il modello tipico di una controllata) lo status è incompatibile. È di " +
        "norma l'ostacolo principale per una società USA-owned.",
    );
  } else if (input.distribuiraUtili === undefined) {
    daConfermare.push(
      "Il parent USA intende far distribuire utili alla controllata? Il divieto di " +
        "distribuzione è assoluto e permane per tutta la durata dello status.",
    );
  }

  if (input.attivitaPrevalenteConsulenza === true) {
    bloccanti.push(
      "Attività prevalente di agenzia/consulenza: esclusa dalla definizione (L. 193/2024).",
    );
  } else if (input.attivitaPrevalenteConsulenza === undefined) {
    daConfermare.push(
      "L'attività prevalente NON è di agenzia/consulenza? (esclusione introdotta da L. 193/2024)",
    );
  }

  if (input.daOperazioneStraordinaria === true) {
    bloccanti.push(
      "Costituita per effetto di fusione/scissione/cessione d'azienda: esclusa.",
    );
  }

  if (input.mesiDallaCostituzione !== undefined) {
    if (input.mesiDallaCostituzione > STARTUP_DURATA_MAX_MESI.valore) {
      bloccanti.push(
        `Oltre il tetto anagrafico: ${input.mesiDallaCostituzione} mesi dalla costituzione ` +
          `(massimo ${STARTUP_DURATA_MAX_MESI.valore} mesi).`,
      );
    }
  }

  if (input.oggettoInnovativo === false) {
    bloccanti.push(
      "Oggetto sociale non innovativo: richiesto oggetto esclusivo/prevalente di sviluppo, " +
        "produzione e commercializzazione di prodotti o servizi innovativi ad alto valore " +
        "tecnologico.",
    );
  } else if (input.oggettoInnovativo === undefined) {
    daConfermare.push(
      "L'oggetto sociale è innovativo ad alto valore tecnologico (esclusivo o prevalente)?",
    );
  }

  if (input.eMpmi === false) {
    bloccanti.push(
      "Non è micro/piccola/media impresa: requisito MPMI introdotto dalla L. 193/2024.",
    );
  } else if (input.eMpmi === undefined) {
    daConfermare.push("È una MPMI ai sensi della Raccomandazione 2003/361/CE?");
  }

  if (input.criterioInnovazione === "nessuno") {
    bloccanti.push(
      "Nessuno dei tre criteri di innovazione soddisfatto: serve almeno uno tra (1) spese " +
        `R&S ≥ ${Math.round(STARTUP_SOGLIA_RS.valore * 100)}% del maggiore tra costo e valore ` +
        "della produzione; (2) ≥1/3 di personale con dottorato/ricerca oppure ≥2/3 con laurea " +
        "magistrale; (3) titolarità/licenza di una privativa industriale o di un software " +
        "registrato afferente all'oggetto sociale.",
    );
  } else if (input.criterioInnovazione === undefined) {
    daConfermare.push(
      "Quale dei tre criteri di innovazione è soddisfatto (R&S ≥15% / personale qualificato " +
        "1/3 o 2/3 / privativa o software registrato)?",
    );
  }

  const note = [
    "La proprietà corporate estera NON è un ostacolo: il requisito 'persone fisiche in " +
      "maggioranza' (ex art. 25 c.2 lett. a) è stato abrogato dal D.L. 76/2013 (conv. L. 99/2013).",
    "Via di costituzione: NOTARILE. La via online del 'modello standard tipizzato' presuppone " +
      "soci persone fisiche con SPID/firma digitale ed è stata comunque annullata dal Consiglio " +
      "di Stato nel 2021: una startup a socio persona giuridica estera segue l'atto pubblico " +
      "notarile.",
    "Permanenza (L. 162/2024): 3 anni base, estendibili a 5 con almeno uno di cinque requisiti, " +
      "fino a un massimo di 9 anni in fase scale-up — i dettagli dei requisiti di estensione " +
      "vanno verificati sul testo vigente.",
  ];

  let ammissibile: boolean | "da_valutare";
  if (bloccanti.length > 0) ammissibile = false;
  else if (daConfermare.length > 0) ammissibile = "da_valutare";
  else ammissibile = true;

  return { ammissibile, bloccanti, daConfermare, note };
}

// --- Tracce di bozza (outline, non atti giuridici) ------------------------

/**
 * Traccia bilingue della board resolution che la parent USA deve adottare. È
 * un OUTLINE da far adattare al legale USA e al notaio: non è la delibera.
 */
export function bozzaBoardResolution(opts: {
  parent?: string;
  denominazione?: string;
  statoUsa?: string;
  firmatario?: string;
}): string[] {
  const parent = opts.parent ?? "[PARENT COMPANY, INC.]";
  const denom = opts.denominazione ?? "[DENOMINAZIONE] S.r.l.";
  const stato = opts.statoUsa ?? "[State]";
  const firm = opts.firmatario ?? "[Name of authorized signatory]";
  return [
    `--- BOZZA (outline) — BOARD RESOLUTION / DELIBERA DEL CDA di ${parent} ---`,
    "Da adattare col legale USA; va poi apostillata e tradotta (traduzione giurata).",
    "",
    `RESOLVED, that ${parent}, a corporation organized under the laws of ${stato}, USA,`,
    `approves the incorporation of a wholly-owned Italian subsidiary, "${denom}", with its`,
    "registered office in [Comune], Italy, and a share capital of EUR [importo];",
    "",
    `RESOLVED FURTHER, that ${firm} is authorized to represent the Company before the Italian`,
    "notary and public authorities, to execute the deed of incorporation and grant any power",
    "of attorney, and to take all actions necessary to complete the incorporation.",
    "--- FINE BOZZA ---",
  ];
}

/**
 * Traccia della procura speciale, quando il firmatario non interviene di
 * persona. OUTLINE, non la procura: la redige il notary public USA (poi
 * apostille + traduzione) o il Consolato italiano (procura consolare).
 */
export function bozzaProcura(opts: {
  parent?: string;
  denominazione?: string;
  procuratore?: string;
}): string[] {
  const parent = opts.parent ?? "[PARENT COMPANY, INC.]";
  const denom = opts.denominazione ?? "[DENOMINAZIONE] S.r.l.";
  const proc = opts.procuratore ?? "[Nome del procuratore in Italia]";
  return [
    "--- BOZZA (traccia) — PROCURA SPECIALE ---",
    "Via (a) notary public USA + apostille + traduzione giurata, oppure (b) procura consolare.",
    "",
    `${parent} conferisce a ${proc} procura speciale per costituire in Italia, in nome e per`,
    `conto della società, la ${denom} (socio unico), sottoscrivere l'atto costitutivo e lo`,
    "statuto, effettuare il versamento del capitale, e compiere ogni atto connesso alla",
    "costituzione e all'iscrizione nel Registro delle Imprese.",
    "--- FINE BOZZA ---",
  ];
}
