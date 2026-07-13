/**
 * Ingresso di una società USA nel mercato italiano — dominio puro: valuta il caso
 * reale e raccomanda il veicolo giusto tra i quattro possibili, risponde alle
 * domande chiave e prepara la bozza di proposta di incarico dello studio.
 *
 * NON assume che la risposta sia una S.r.l.: la sceglie. È l'advisor a monte del
 * tool `costituzione_controllata_usa` (che copre solo il caso S.r.l.).
 *
 * ⚠️ FONTI E PESO. Ogni raccomandazione porta la sua ragione e le sue fonti; le
 * cifre fiscali sono citate, non calcolate. Ogni output è una BOZZA: la decisione
 * resta del cliente, e i profili fiscali/notarili vanno confermati col
 * professionista. Ricerca di grounding: 2026-07-10 (fan-out di 5 ricerche
 * mirate su fonti ufficiali/primarie). Le voci `da_verificare` vanno esposte.
 *
 * Il perno è la STABILE ORGANIZZAZIONE (art. 162 TUIR): finché l'attività in
 * Italia non configura una S.O., "solo IVA" o "ufficio di rappresentanza"
 * bastano e non c'è imposta sui redditi in Italia; oltre quella soglia si passa a
 * branch o S.r.l. (imposizione IRES/IRAP).
 */

export type Veicolo =
  | "posizione_iva"
  | "ufficio_rappresentanza"
  | "branch"
  | "srl";

export type Attivita =
  | "solo_vendite"
  | "promozione"
  | "operazioni"
  | "holding_ip"
  | "rd";

export type PresenzaFisica = "nessuna" | "magazzino" | "ufficio" | "punto_vendita";
export type ResidenzaFounder = "usa" | "italia" | "misto";
export type Orizzonte = "test" | "stabile";

export type IngressoInput = {
  /** Descrizione libera dell'obiettivo, per la riproposizione al cliente. */
  obiettivo?: string;
  /** Cosa farà la società in Italia (guida la scelta del veicolo). */
  attivita?: Attivita;
  /** Impronta fisica in Italia. */
  presenzaFisica?: PresenzaFisica;
  /** Assumerà personale in Italia. */
  assumeraPersonale?: boolean;
  /** Un soggetto in Italia conclude abitualmente contratti in nome della società (agency PE). */
  concludeContrattiInItalia?: boolean;
  /** Vuole rimpatriare utili al parent USA. */
  distribuiraUtili?: boolean;
  /** Vuole lo scudo della responsabilità limitata. */
  vuoleResponsabilitaLimitata?: boolean;
  /** Dove vivono/gestiscono i founder. */
  residenzaFounder?: ResidenzaFounder;
  /** Test di mercato vs presenza stabile. */
  orizzonte?: Orizzonte;
  /** Entità USA esistente (denominazione/tipo), per contesto. */
  usEntity?: string;
};

export type VeicoloInfo = { nome: string; cosa: string; fonte: string };

export const VEICOLI: Record<Veicolo, VeicoloInfo> = {
  posizione_iva: {
    nome: "Posizione IVA (rappresentante fiscale)",
    cosa:
      "Solo una partita IVA italiana gestita da un rappresentante fiscale residente, senza " +
      "società né imposte sui redditi in Italia. Una società USA (extra-UE) NON può usare " +
      "l'identificazione diretta (art. 35-ter, riservata a UE e Paesi con accordo di mutua " +
      "assistenza IVA — di fatto solo Norvegia e UK): deve nominare un rappresentante fiscale.",
    fonte: "art. 17 c.3 DPR 633/72 (rappr. fiscale); art. 35-ter DPR 633/72; AdE modello ANR/3",
  },
  ufficio_rappresentanza: {
    nome: "Ufficio di rappresentanza",
    cosa:
      "Presidio non commerciale: solo attività preparatorie/ausiliarie (promozione, ricerca di " +
      "mercato, informazione). Non può vendere, fatturare o concludere contratti. Iscritto solo " +
      "al REA, niente IVA né imposte sui redditi; se sconfina in attività commerciale diventa " +
      "una stabile organizzazione occulta, tassabile retroattivamente.",
    fonte: "art. 162 c.4 TUIR (attività preparatorie/ausiliarie); iscrizione REA via ComUnica",
  },
  branch: {
    nome: "Branch (sede secondaria / stabile organizzazione)",
    cosa:
      "La stessa società USA che apre una sede stabile in Italia: nessuna personalità giuridica " +
      "autonoma, quindi il parent risponde di tutto. È per definizione una stabile organizzazione " +
      "→ IRES 24% + IRAP sul reddito attribuibile, contabilità e dichiarazioni italiane. Il " +
      "rimpatrio degli utili alla casa madre non sconta ritenuta; le perdite possono confluire nel " +
      "parent.",
    fonte: "artt. 2508 c.c. (sede secondaria) e 152/162 TUIR (S.O.); iscrizione Registro Imprese",
  },
  srl: {
    nome: "S.r.l. (controllata italiana)",
    cosa:
      "Una società italiana autonoma interamente controllata dal parent USA: responsabilità " +
      "limitata, credibilità locale, piena capacità di assumere e contrattare. IRES 24% + IRAP; i " +
      "dividendi al parent scontano la ritenuta convenzionale (5% con ≥25% dei voti da ≥12 mesi, " +
      "altrimenti 15% — mai 0%). Copre anche l'opzione startup innovativa.",
    fonte: "artt. 2463 ss. c.c.; Conv. Italia-USA art. 10 (L. 20/2009); vedi costituzione-controllata-usa",
  },
};

export type Raccomandazione = {
  principale: Veicolo;
  /** Ragioni della scelta, ancorate al caso. */
  motivi: string[];
  /** Altri veicoli con la condizione in cui diventano preferibili. */
  alternative: { veicolo: Veicolo; quando: string }[];
  /** Rischi/bandiere da presidiare (PE, esterovestizione, responsabilità, ritenute). */
  bandiere: string[];
};

/** Valuta se l'attività descritta configura (o rischia) una stabile organizzazione. */
export function livelloStabileOrganizzazione(
  input: IngressoInput,
): "si" | "probabile" | "no" {
  if (
    input.attivita === "operazioni" ||
    input.attivita === "rd" ||
    input.presenzaFisica === "ufficio" ||
    input.presenzaFisica === "punto_vendita" ||
    input.concludeContrattiInItalia === true
  )
    return "si";
  if (input.presenzaFisica === "magazzino" || input.assumeraPersonale === true)
    return "probabile";
  return "no";
}

/**
 * Sceglie il veicolo raccomandato dal caso reale. Euristica grounded:
 * - promozione pura, nessuna vendita → ufficio di rappresentanza;
 * - solo vendite senza stabile organizzazione → posizione IVA (rappr. fiscale);
 * - attività reale / stabile organizzazione → S.r.l. di default, branch solo per
 *   progetto singolo temporaneo in cui si accetta la responsabilità del parent e
 *   si vuole il transito di utili/perdite;
 * - founder residenti in Italia → S.r.l. + presidio governance (esterovestizione).
 */
export function raccomandaVeicolo(input: IngressoInput): Raccomandazione {
  const pe = livelloStabileOrganizzazione(input);
  const founderItalia =
    input.residenzaFounder === "italia" || input.residenzaFounder === "misto";
  const motivi: string[] = [];
  const bandiere: string[] = [];

  // Bandiera trasversale: il perno della stabile organizzazione.
  bandiere.push(
    "Stabile organizzazione (art. 162 TUIR) è il perno: nel momento in cui l'attività in Italia " +
      "configura una S.O. (sede fissa operativa, personale che conclude affari, magazzino " +
      "operativo, presenza economica significativa e continuativa), scatta l'imposta italiana sui " +
      "redditi a prescindere dal veicolo scelto.",
  );
  if (founderItalia) {
    bandiere.push(
      "Founder residenti in Italia: rischio che la stessa società USA sia ritenuta fiscalmente " +
        "residente in Italia (sede di direzione effettiva, art. 73 c.3 TUIR; presunzione c.5-bis se " +
        "controllata da residenti italiani) — esterovestizione. Documentare dove si assumono le " +
        "decisioni; una società italiana è di norma la struttura più coerente e difendibile.",
    );
  }

  let principale: Veicolo;
  const alternative: { veicolo: Veicolo; quando: string }[] = [];

  if (input.attivita === "promozione" && pe !== "si") {
    principale = "ufficio_rappresentanza";
    motivi.push(
      "Obiettivo di sola promozione/ricerca di mercato senza vendite: l'ufficio di rappresentanza " +
        "è il presidio più leggero, senza IVA né imposte sui redditi.",
    );
    if (input.assumeraPersonale)
      motivi.push(
        "Può assumere personale locale per funzioni ausiliarie (con codice fiscale per INPS/INAIL), " +
          "purché non concluda affari.",
      );
    bandiere.push(
      "Limite stretto: niente vendite, fatture o contratti. Al primo atto commerciale diventa una " +
        "stabile organizzazione occulta, tassabile retroattivamente → convertire in branch o S.r.l.",
    );
    alternative.push({
      veicolo: "srl",
      quando: "quando inizia a fare business (vendere, assumere a regime, contrattare)",
    });
    alternative.push({
      veicolo: "posizione_iva",
      quando: "se in realtà vuole già vendere in Italia senza una struttura operativa",
    });
  } else if (input.attivita === "solo_vendite" && pe === "no") {
    principale = "posizione_iva";
    motivi.push(
      "Obiettivo di sole vendite in Italia senza sede fissa operativa: basta la posizione IVA " +
        "gestita da un rappresentante fiscale — nessuna imposizione sui redditi, costi e tempi minimi.",
    );
    bandiere.push(
      "La società USA (extra-UE) non può fare identificazione diretta: serve un rappresentante " +
        "fiscale residente, responsabile in solido per l'IVA (di norma chiede una garanzia).",
    );
    alternative.push({
      veicolo: "branch",
      quando: "se compaiono magazzino operativo, personale o un agente che conclude contratti (S.O.)",
    });
    alternative.push({
      veicolo: "srl",
      quando: "se l'attività diventa stabile e serve responsabilità limitata e credibilità locale",
    });
  } else if (input.attivita === "solo_vendite" && pe === "probabile") {
    principale = "posizione_iva";
    motivi.push(
      "Vendite in Italia: si può partire con la posizione IVA (rappresentante fiscale), ma la " +
        "presenza indicata (magazzino operativo o personale) va monitorata da vicino.",
    );
    bandiere.push(
      "Attenzione soglia S.O.: un magazzino operativo può configurare una stabile organizzazione " +
        "materiale; personale o un agente che conclude contratti fanno scattare la S.O. → in quel " +
        "caso si passa a branch o S.r.l. con imposizione sui redditi.",
    );
    alternative.push({
      veicolo: "srl",
      quando: "se la presenza si consolida in una stabile organizzazione",
    });
    alternative.push({
      veicolo: "branch",
      quando: "se si vuole tenere tutto in capo al parent, accettandone la responsabilità",
    });
  } else if (input.attivita === "holding_ip") {
    principale = "srl";
    motivi.push(
      "Detenzione di partecipazioni/IP: una S.r.l. autonoma è il soggetto naturale per detenere gli " +
        "asset e pianificare dividendi/royalty.",
    );
    alternative.push({
      veicolo: "branch",
      quando: "raramente: se si vuole tenere l'attività in capo al parent senza entità separata",
    });
  } else {
    // Attività reale / stabile organizzazione: branch vs S.r.l.
    const preferBranch =
      input.orizzonte === "test" &&
      input.vuoleResponsabilitaLimitata === false &&
      !founderItalia &&
      input.assumeraPersonale !== true;
    if (preferBranch) {
      principale = "branch";
      motivi.push(
        "Progetto singolo/temporaneo in cui si accetta la responsabilità diretta del parent: il " +
          "branch ha setup più snello, il rimpatrio degli utili alla casa madre non sconta ritenuta e " +
          "le perdite possono confluire nel parent.",
      );
      bandiere.push(
        "Il branch NON offre scudo di responsabilità: ogni debito, causa di lavoro e obbligazione " +
          "fiscale è direttamente del parent USA. Serve contabilità separata e transfer pricing con la " +
          "casa madre.",
      );
      alternative.push({
        veicolo: "srl",
        quando: "appena l'operazione diventa stabile e profittevole, o serve lo scudo di responsabilità",
      });
    } else {
      principale = "srl";
      motivi.push(
        "Attività operativa stabile in Italia: la S.r.l. dà responsabilità limitata, credibilità " +
          "locale (banche, gare, assunzioni) e struttura pulita; è anche la strada per la startup " +
          "innovativa dove applicabile.",
      );
      if (input.distribuiraUtili)
        bandiere.push(
          "Rimpatrio utili: i dividendi al parent USA scontano la ritenuta convenzionale del 5% (con " +
            "≥25% dei voti da ≥12 mesi) o 15% — mai 0%; la direttiva madre-figlia UE non si applica.",
        );
      alternative.push({
        veicolo: "branch",
        quando:
          "progetto singolo/temporaneo in cui si accetta la responsabilità del parent e si vuole il " +
          "transito di utili/perdite (nessuna ritenuta sul rimpatrio)",
      });
      if (pe === "no")
        alternative.push({
          veicolo: "posizione_iva",
          quando: "se in realtà si tratta solo di vendere in Italia senza struttura operativa",
        });
    }
  }

  return { principale, motivi, alternative, bandiere };
}

// --- Domande chiave, con risposta adattata al veicolo raccomandato ---------

export type QA = { domanda: string; risposta: string };

export function faqPersonalizzate(
  veicolo: Veicolo,
  input: IngressoInput,
): QA[] {
  const qa: QA[] = [];

  qa.push({
    domanda: "Serve costituire una società italiana?",
    risposta:
      veicolo === "srl"
        ? "Sì: una S.r.l. italiana (atto notarile). È un soggetto giuridico autonomo."
        : veicolo === "branch"
          ? "No una nuova società: si apre una sede secondaria della stessa società USA (atto notarile e iscrizione al Registro Imprese), non un soggetto separato."
          : veicolo === "ufficio_rappresentanza"
            ? "No: l'ufficio di rappresentanza si iscrive solo al REA, senza atto notarile né capitale."
            : "No: basta aprire una posizione IVA tramite un rappresentante fiscale, senza società.",
  });

  qa.push({
    domanda: "Pagherà imposte sui redditi in Italia?",
    risposta:
      veicolo === "srl" || veicolo === "branch"
        ? "Sì: IRES 24% + IRAP (base ~3,9%, aliquota regionale da verificare) sul reddito prodotto/attribuibile in Italia."
        : veicolo === "posizione_iva"
          ? "No sui redditi: solo obblighi IVA (fatturazione elettronica via SdI/esterometro, liquidazioni, dichiarazione annuale, Intrastat). L'imposta sui redditi scatta solo se si forma una stabile organizzazione."
          : "No: nessuna imposta sui redditi né IVA, finché resta nei limiti dell'attività preparatoria/ausiliaria.",
  });

  if (input.distribuiraUtili || veicolo === "srl" || veicolo === "branch") {
    qa.push({
      domanda: "Come rimpatrio gli utili verso gli USA?",
      risposta:
        veicolo === "branch"
          ? "Il branch rimette gli utili alla casa madre come allocazione interna: nessuna ritenuta italiana sul rimpatrio."
          : veicolo === "srl"
            ? "Come dividendi: ritenuta convenzionale del 5% (parent con ≥25% dei voti da ≥12 mesi) o 15% (Conv. Italia-USA; senza trattato sarebbe 26%). Serve il certificato di residenza fiscale USA (Form 6166) e la prova del beneficiario effettivo."
            : "Non applicabile: non ci sono utili societari italiani da distribuire.",
    });
  }

  qa.push({
    domanda: "Un founder/amministratore che vive negli USA può gestirla? Devo trasferirmi in Italia?",
    risposta:
      "Sì, un amministratore non residente è ammesso e non serve trasferirsi (serve però il suo codice " +
      "fiscale italiano). Attenzione al rovescio: se i founder vivono e dirigono l'attività dall'Italia, " +
      "la società rischia di essere considerata fiscalmente residente in Italia (esterovestizione, art. 73 " +
      "TUIR) — conta dove si assumono le decisioni.",
  });

  if (veicolo === "srl") {
    qa.push({
      domanda: "Quanto capitale serve?",
      risposta:
        "S.r.l.: minimo €10.000 (ammesso €1–€9.999,99 con vincoli). Da socio unico va versato il 100% " +
        "all'atto, all'organo amministrativo o su conto escrow del notaio (non serve un conto della " +
        "società prima dell'iscrizione).",
    });
  } else {
    qa.push({
      domanda: "Quanto capitale serve?",
      risposta:
        veicolo === "branch"
          ? "Nessun capitale sociale: il branch non è una società separata (ma va iscritto al Registro Imprese)."
          : "Nessun capitale: né la posizione IVA né l'ufficio di rappresentanza richiedono capitale sociale.",
    });
  }

  qa.push({
    domanda: "Posso assumere personale in Italia?",
    risposta:
      veicolo === "srl" || veicolo === "branch"
        ? "Sì, pienamente (con gli adempimenti di lavoro/paghe — competenza del consulente del lavoro)."
        : veicolo === "ufficio_rappresentanza"
          ? "Sì, ma solo per funzioni ausiliarie (marketing, ricerca): serve un codice fiscale per gli obblighi INPS/INAIL. Se il personale conclude affari, scatta la stabile organizzazione."
          : "Con una mera posizione IVA l'assunzione è un caso limite (serve una rappresentanza previdenziale) e spesso segnala già una stabile organizzazione: da valutare.",
  });

  qa.push({
    domanda: "Quanto costa e quanto tempo serve per partire?",
    risposta:
      veicolo === "posizione_iva" || veicolo === "ufficio_rappresentanza"
        ? "Setup leggero e rapido (nessun notaio né capitale); i costi sono soprattutto il canone del servizio (rappresentante fiscale / gestione)."
        : veicolo === "branch"
          ? "Setup medio: atto notarile con documenti del parent apostillati e tradotti, iscrizione al Registro Imprese, poi contabilità e dichiarazioni italiane."
          : "Setup medio: documenti del parent apostillati e tradotti, codici fiscali, atto notarile, ComUnica; la società esiste con l'iscrizione (deposito entro 10 giorni). Vedi lo strumento `costituzione_controllata_usa` per la roadmap completa.",
  });

  return qa;
}

// --- Piano di partenza, per veicolo ---------------------------------------

export function pianoDiPartenza(veicolo: Veicolo, input: IngressoInput): string[] {
  switch (veicolo) {
    case "posizione_iva":
      return [
        "1. Nominare un rappresentante fiscale residente in Italia (atto/scrittura registrata prima delle operazioni).",
        "2. Aprire la posizione IVA italiana tramite il rappresentante.",
        "3. Attivare la fatturazione elettronica via SdI e il flusso esterometro (TD17/18/19 per gli acquisti).",
        "4. Impostare liquidazioni IVA periodiche, dichiarazione annuale ed eventuali elenchi Intrastat.",
        "5. Monitorare la soglia della stabile organizzazione (magazzino operativo, personale, agente che conclude contratti): se scatta, passare a branch o S.r.l.",
      ];
    case "ufficio_rappresentanza":
      return [
        "1. Reperire dal parent i documenti (con apostille + traduzione giurata) e la delibera di apertura con nomina del rappresentante.",
        "2. Iscrivere l'ufficio al REA tramite ComUnica.",
        "3. Se assume personale ausiliario: richiedere il codice fiscale per gli obblighi INPS/INAIL e nominare la rappresentanza previdenziale.",
        "4. Tenere l'attività rigorosamente entro il perimetro preparatorio/ausiliario (niente vendite/contratti).",
        "5. Pianificare la conversione in branch o S.r.l. quando si passerà a fare business.",
      ];
    case "branch":
      return [
        "1. Reperire dal parent i documenti (Certificate of Incorporation/Good Standing, statuto) e la delibera che istituisce la sede secondaria e nomina il rappresentante stabile — con apostille + traduzione giurata.",
        "2. Atto notarile e deposito dei documenti; iscrizione della sede secondaria al Registro Imprese (modelli S1 + UL + Int P) via ComUnica.",
        "3. Aprire la partita IVA della sede secondaria.",
        "4. Impostare contabilità separata italiana e le dichiarazioni IRES/IRAP sul reddito attribuibile.",
        "5. Impostare la documentazione di transfer pricing con la casa madre.",
      ];
    case "srl":
      return [
        "1. Fissare denominazione, capitale (100% all'atto da socio unico), oggetto/ATECO e governance.",
        "2. Avviare subito la raccolta dei documenti del parent USA (apostille + traduzione giurata) e i codici fiscali di parent e amministratori.",
        input.distribuiraUtili
          ? "3. Impostare la pianificazione dei dividendi (ritenuta 5%/15%) e del transfer pricing cross-border."
          : "3. Impostare fin dall'inizio la governance per tenere la società chiaramente residente in Italia.",
        "4. Usare lo strumento `costituzione_controllata_usa` per la roadmap completa passo-passo (atto notarile, deposito entro 10 giorni, PEC, titolare effettivo, conto).",
        "5. Valutare, se pertinente, l'ammissibilità a startup innovativa (attenzione al divieto di distribuzione utili).",
      ];
  }
}

// --- Bozza di proposta di incarico (BOZZA, la decisione resta del cliente) --

export function bozzaPropostaIncarico(
  veicolo: Veicolo,
  input: IngressoInput,
): string[] {
  const info = VEICOLI[veicolo];
  const cliente = input.usEntity ?? "[società USA]";
  return [
    "--- BOZZA — PROPOSTA DI INCARICO PROFESSIONALE (da rivedere e firmare dallo studio) ---",
    "Studio: [denominazione, iscrizione ODCEC, P.IVA, estremi polizza RC] — art. 9 c.4 D.L. 1/2012.",
    `Cliente proposto: ${cliente} (e la struttura italiana: ${info.nome}).`,
    "",
    `Oggetto dell'incarico: assistenza all'ingresso in Italia tramite ${info.nome}, con i relativi`,
    "adempimenti (costituzione/registrazione, aperture fiscali, adempimenti ricorrenti) e la",
    "consulenza cross-border collegata. Attività escluse: [da specificare — es. paghe/lavoro,",
    "pareri legali, revisione].",
    "Grado di complessità: elevato (struttura estera cross-border).",
    "Durata e decorrenza: dalla firma; [incarico singolo | rapporto continuativo con rinnovo].",
    "Corrispettivo — preventivo di massima in forma scritta (art. 9): [voci per prestazione,",
    "spese, contributo cassa CNPADC 4%, IVA]. Coerente con l'equo compenso.",
    "Antiriciclaggio: prima del conferimento va completata l'adeguata verifica (cliente + titolare",
    "effettivo lungo la catena USA + scopo/natura); per una struttura estera controllata è",
    "tipicamente richiesta la verifica RAFFORZATA (D.Lgs. 231/2007). Documenti KYC: [elenco].",
    "Privacy/GDPR: informativa allegata. Recesso/foro: [clausole].",
    "Validità dell'offerta: [data]. Firma per accettazione: ____________________.",
    "--- FINE BOZZA — informazione veritiera e non ingannevole (art. 44 Codice Deontologico); la",
    "decisione di conferire l'incarico resta del cliente. ---",
  ];
}
