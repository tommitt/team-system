import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP prompts — la parte "metodo + template" delle skill, che vive nel server ma
 * guida il client (Claude Code). Non consumano il gate di billing (sono
 * template, non chiamate a tool). S7 estrazione, L2 tono di comunicazione,
 * T1 convenzione studio-db (lo stato client-local, ADR 0003).
 */
export function registerPrompts(server: McpServer) {
  server.prompt(
    "convenzione_studio_db",
    "La convenzione `studio/` — i file markdown dello studio che fanno da database client-local " +
      "(anagrafica, scadenzario, stato campagne). Il server non persiste nulla: lo stato vive qui.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Mantieni lo stato dello studio in una cartella `studio/` nella workspace, in markdown (leggibile dal professionista, aggiornabile da te). Il server Dott. Comm. non salva MAI questi dati: sono dello studio.",
              "",
              "Struttura:",
              "- `studio/clienti.md` — l'anagrafica: una tabella con colonne `Cliente | Regime | Forma | IVA | Sostituto | INPS art/comm | Immobili | Note`. È la fonte degli attributi per `scadenze_cliente` e per le campagne.",
              "- `studio/scadenzario.md` — la matrice operativa: `Cliente | Scadenza | Adempimento | Assegnatario | Stato` (stati: `da fare`, `in corso`, `fatto`, `inviato`, `confermato`). Alimentato da `scadenze_cliente` e da `triage_atto`; ordinato per data.",
              "- `studio/raccolta/<campagna>.md` — stato di una campagna di raccolta documenti: `Cliente | Mancanti | Sollecitato il | Stato`. Alimentato da `raccolta_documenti`.",
              "- `studio/versamenti/<scadenza>.md` — stato delle comunicazioni di versamento: `Cliente | Importo | Canale | Inviata il | Confermata`. Alimentato da `comunica_versamenti`.",
              "- `studio/spese-sanitarie/<cliente>-<anno>.csv` — il riepilogo spese sanitarie di un contribuente, una riga per documento (colonne `Data,Fornitore,Descrizione,Importo,Rigo,Detraibile,Tracciabilita_richiesta,Pagamento_tracciabile,In_precompilata,Azione,Esito,Intestatario`) più i subtotali per rigo e la detrazione stimata in coda. È il CSV emesso dal tool `detrazione_sanitaria`: salvalo qui e importalo nel foglio Excel/Google Sheet dello studio. Audit trail difendibile in caso di controllo formale.",
              "- `studio/spese-sanitarie/config.md` — preferenze apprese seguendo il prompt `metodo_estrazione_spese_sanitarie`: dove sono archiviati i documenti (cartella locale / Google Drive / Dropbox), dove vive il calcolo (Excel locale / Google Sheet) e, opzionalmente, la riga `Colonne foglio` con lo schema personalizzato delle colonne (passato al tool come `colonne`). Chiesto una volta all'utente, poi riusato e modificabile.",
              "- `studio/costituzioni/<societa>.md` — lo stato di una pratica di costituzione societaria (es. S.r.l. controllata da società USA): una riga per voce della checklist `Voce | Fase | A carico | Stato | Data` (stati: `da fare`, `richiesto`, `ricevuto`, `fatto`), più le date chiave (richiesta/ricezione documenti apostillati, atto, termine dei 10 giorni per il deposito al Registro Imprese, 30 giorni per il titolare effettivo). Alimentato dal tool `costituzione_controllata_usa`. Audit trail della pratica.",
              "- `studio/ingresso/<cliente>.md` — l'orientamento di una società estera (es. USA) che valuta come entrare nel mercato italiano: la situazione raccolta, il veicolo consigliato (posizione IVA / ufficio di rappresentanza / branch / S.r.l.), e lo stato della proposta di incarico (`bozza`, `inviata`, `accettata`). Alimentato dal tool `valuta_ingresso_italia`; se il cliente sceglie la S.r.l., prosegue in `studio/costituzioni/<societa>.md`.",
              "",
              "Regole:",
              "- Date sempre assolute (YYYY-MM-DD), mai relative.",
              "- Una riga per item; aggiorna la riga esistente invece di duplicarla.",
              "- Dopo ogni azione (sollecito inviato, pagamento confermato, atto registrato) aggiorna subito il file corrispondente: è l'audit trail dello studio.",
              "- Prima di una campagna, leggi il file di stato per riprendere da dove si era rimasti.",
              "- Per derivare `documenti_presenti` di `raccolta_documenti`, scandisci la cartella documenti dello studio (o l'export della casella email) invece di chiedere all'utente, quando possibile.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "metodo_estrazione_documenti",
    "Metodo per estrarre dati strutturati da ricevute, scontrini, fatture estere ed export " +
      "gestionale, pronti per `estrai_documenti`.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Estrai da ogni documento una riga con questi campi, poi passa l'elenco al tool `estrai_documenti`:",
              "- tipo (fattura, ricevuta, scontrino, nota di credito, contratto)",
              "- data (così com'è nel documento; il tool la normalizza)",
              "- importo (totale documento; per le fatture indica imponibile e IVA se distinti)",
              "- controparte (fornitore/cliente)",
              "- piva_cf (partita IVA o codice fiscale, se presente)",
              "- descrizione (oggetto/causale)",
              "",
              "Regole:",
              "- Non inventare valori: se un campo è illeggibile lascialo vuoto, il tool lo segnalerà come dubbio.",
              "- Per le fatture estere annota la valuta e che alimentano esterometro/TD17-19.",
              "- Segnala separatamente i documenti totalmente illeggibili invece di indovinare.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "metodo_estrazione_spese_sanitarie",
    "La procedura completa per estrarre le spese sanitarie da scontrini e fatture mediche di un " +
      "contribuente e compilare il Riepilogo per la detrazione IRPEF: chiede/ricorda dove sono i " +
      "documenti e dove fare il calcolo, estrae e classifica, chiama `detrazione_sanitaria`, e " +
      "scrive il foglio (Excel/Google Sheet) dello studio. Ogni output è una bozza.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Compila il Riepilogo spese sanitarie di un contribuente per la detrazione IRPEF (Quadro E del 730 / Quadro RP di Redditi PF). Tu (il client) fai ciò che il server non può — leggere i documenti con la vista, chiedere/ricordare le preferenze, scrivere il foglio; il tool `detrazione_sanitaria` fa l'aritmetica a peso legale (unica fonte dei numeri: non ricalcolarli). Ogni output è una BOZZA: la detrazione definitiva la calcola il sostituto/CAF, la responsabilità resta del professionista.",
              "",
              "PROCEDURA",
              "0) Configurazione (chiedi una volta, poi ricorda). Leggi `studio/spese-sanitarie/config.md`. Se manca, chiedi all'utente (a) dove sono i documenti — cartella locale, Google Drive o Dropbox — e (b) dove vuole fare il calcolo — Excel locale o Google Sheet — poi salva le risposte in `config.md` (vedi il prompt `convenzione_studio_db`). Alle esecuzioni successive usa il file senza richiedere. Il config.md può anche fissare lo SCHEMA del foglio (riga `Colonne foglio`): l'elenco/ordine delle colonne che lo studio vuole; se presente, passalo come parametro `colonne` a `detrazione_sanitaria`. Se l'utente chiede di aggiungere/togliere/riordinare colonne, aggiorna quella riga.",
              "1) Cliente e anno. Determina nome del contribuente e anno d'imposta (es. 2025 per la dichiarazione 2026). Suggerisci: la fonte più pulita è il prospetto del Sistema Tessera Sanitaria (scaricabile dall'area riservata TS, anche dal professionista delegato) — è la base del precompilato; se c'è, trattalo come `in_precompilata=true` azione `confermata` e usa gli scontrini per le sole voci non presenti.",
              "2) Raccogli i documenti dalla fonte configurata (immagini/PDF). Google Drive via connettore se disponibile; Dropbox via cartella sincronizzata in locale.",
              "3) Estrai una riga per documento con la vista, con questi campi:",
              "   - importo (in euro); rimborso (quota rimborsata da assicurazione/fondo/datore, se nota — verrà scorporata); bollo (marca da bollo €2, se presente in fattura)",
              "   - rigo: E1c2 (generiche: visite, analisi, farmaci, ticket, dentista, occhiali, fisioterapia — anche per un disabile), E1c1 (patologie esenti), E2 (familiare NON a carico con patologia esente), E3 (disabili: SOLO mezzi/ausili/sussidi tecnici, NON le visite), E4 (veicoli disabili), E5 (cane guida), E25 (spese mediche generiche/assistenza specifica dei disabili — è DEDUZIONE, non detrazione 19%)",
              "   - detraibile, tracciabilita_richiesta, pagamento_tracciabile, in_precompilata, azione (confermata|aggiunta|modificata|eliminata), data, numero, fornitore, codice_fiscale (dell'intestatario, sullo scontrino parlante), prova_pagamento, intestatario (chi paga), beneficiario (paziente + a carico/non a carico), patologia_esente, descrizione, note",
              "4) Chiama `detrazione_sanitaria` con cliente, anno e l'array `voci`. Ricevi subtotali per rigo, detrazione stimata, scarti, avvisi e il foglio già pronto in CSV.",
              "5) Scrivi il foglio: salva il CSV emesso in `studio/spese-sanitarie/<cliente>-<anno>.csv` (audit trail) e importalo nella destinazione configurata (foglio Excel locale o Google Sheet via connettore). Lo schema delle colonne è quello che hai passato in `colonne` (default se non specificato); non ricalcolare subtotali/detrazione: usa quelli del tool.",
              "6) Riporta all'utente: subtotali per rigo, detrazione stimata, eventuale rateizzabilità, e la coda da rivedere (documenti dubbi/illeggibili, voci scartate per tracciabilità o non detraibili, possibili doppi conteggi col precompilato, importo aggiunto/modificato da documentare). Chiudi ricordando che è una BOZZA.",
              "",
              "REGOLE DI CLASSIFICAZIONE",
              "- tracciabilita_richiesta = false per FARMACI, DISPOSITIVI MEDICI e prestazioni di strutture PUBBLICHE o private ACCREDITATE al SSN (contanti ammessi, comma 680); = true per prestazioni di privati/strutture non accreditate (serve pagamento tracciabile, altrimenti la detrazione è persa).",
              "- FARMACI: detraibili solo con 'scontrino parlante' valido — codice fiscale del contribuente + natura (farmaco/OTC) + qualità (codice AIC) + quantità. Se manca CF o AIC, non indovinare: metti detraibile=false o mettila tra i dubbi.",
              "- DISPOSITIVI MEDICI: detraibili se marcatura CE risultante dal documento.",
              "- DISABILI — attenzione al rigo: le visite/prestazioni specialistiche di un disabile vanno in E1 (con franchigia); solo mezzi di ausilio/deambulazione/sollevamento e sussidi tecnici e informatici vanno in E3 (19% pieno); le spese mediche generiche e di assistenza specifica dei disabili vanno in E25 come ONERE DEDUCIBILE (riducono il reddito, non 19%). Non instradare in E3 le spese mediche generiche.",
              "- RIMBORSI: se una spesa è (anche in parte) rimborsata da assicurazione/fondo sanitario/datore, la parte rimborsata NON è detraibile — indicala nel campo rimborso o riporta l'importo già al netto.",
              "- SCONTRINO PARLANTE: valido solo con codice fiscale del contribuente + natura + codice AIC + quantità; se manca uno di questi la spesa non è detraibile.",
              "- NON detraibili: parafarmaci, integratori, prodotti erboristici, spese estetiche, parti in metalli/pietre preziose (montature).",
              "- Evita il DOPPIO CONTEGGIO: se una spesa è già nel prospetto Sistema TS (in_precompilata=true) non ri-aggiungerla come 'aggiunta'.",
              "- Non inventare valori: campo illeggibile → vuoto e nella coda dei dubbi; documento illeggibile → coda dei dubbi, non forzare la classificazione.",
              "- Privacy: foto/scansioni possono contenere dati sanitari; trattale nei soli spazi dello studio, non caricarle su servizi esterni non concordati.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "tono_comunicazione_studio",
    "Linee guida di tono per le bozze di comunicazione al cliente (usate con `comunica_versamenti` " +
      "e `raccolta_documenti`).",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Quando riscrivi le bozze di comunicazione al cliente, mantieni questo tono:",
              "- Professionale ma cordiale, del 'tu' salvo indicazione diversa; italiano semplice, niente gergo fiscale non spiegato.",
              "- Chiaro su cosa fare e entro quando; un'unica call-to-action per messaggio.",
              "- Rassicurante sui timori tipici (proroga, rateizzazione, sanzioni) senza promettere nulla che il professionista non abbia confermato.",
              "- Ogni comunicazione resta una BOZZA: la invia lo studio dopo revisione, la responsabilità è del professionista.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "metodo_costituzione_controllata_usa",
    "Metodo per assistere la costituzione di una S.r.l. italiana interamente controllata da una " +
      "società USA: quali informazioni e documenti servono, in che ordine chiederli, e come usare " +
      "il tool `costituzione_controllata_usa`.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Assisti la costituzione di una S.r.l. italiana interamente controllata da una società USA (socio unico persona giuridica estera). Tu (il client) raccogli il contesto e i documenti; il tool `costituzione_controllata_usa` produce la roadmap ordinata, lo stato della checklist, cosa richiedere, la valutazione startup innovativa e le bozze. Ogni output è una BOZZA: i passaggi notarili e fiscali li conferma il professionista con notaio e consulente. Non inventare date, importi o requisiti: se un dato manca, chiedilo.",
              "",
              "PROCEDURA",
              "0) Stato pratica. Leggi `studio/costituzioni/<societa>.md` se esiste (vedi `convenzione_studio_db`) e riprendi da dove si era rimasti; altrimenti parti pulito.",
              "1) Contesto minimo (chiedi, una domanda alla volta): denominazione proposta della S.r.l.; nome e Stato USA della capogruppo; capitale sociale previsto e tipo di conferimento (denaro o natura — la natura esclude l'atto online); chi sarà amministratore ed è residente o non residente; se i documenti della parent sono già disponibili allo studio.",
              "2) Documenti già presenti. Se hai accesso a una cartella dei documenti della pratica, scandiscila e derivane le chiavi già acquisite (es. `certificate_incorporation`, `board_resolution`, `cf_parent`) invece di chiederle all'utente. Passale come `documenti_presenti`.",
              "3) Valutazione startup innovativa. Se il cliente valuta lo status di startup innovativa, chiedi i dati del blocco `startup`: distribuirà utili al parent (il divieto assoluto di distribuzione è di norma l'ostacolo per una controllata USA), oggetto innovativo, MPMI, attività prevalente di consulenza, mesi dalla costituzione, se nasce da operazioni straordinarie, e quale criterio d'innovazione è soddisfatto. Lascia vuoti i campi ignoti: finiscono tra i 'da confermare'.",
              "4) Chiama `costituzione_controllata_usa` con i dati raccolti. Restituisce roadmap, stato, cosa richiedere e a chi, valutazione startup, bozze.",
              "5) Presenta all'utente: i prossimi 1-2 passi concreti (di norma: procurare i documenti della parent con apostille+traduzione, e i codici fiscali di parent e amministratori), la lista di cosa richiedere, e — se ha chiesto lo status — l'esito startup innovativa. Evidenzia le voci ⚠️ DA VERIFICARE (prassi notarile, registro titolari effettivi in riattivazione, aliquota IRAP regionale) come punti da confermare, non come certezze.",
              "6) Bozze. Le tracce di board resolution e procura sono OUTLINE da far adattare al legale USA e al notaio, non atti giuridici: salvale tra i documenti della pratica solo come base di lavoro.",
              "7) Aggiorna `studio/costituzioni/<societa>.md` con lo stato: voci completate, date di richiesta/ricezione documenti, e i termini (10 giorni deposito al Registro Imprese, 30 giorni titolare effettivo quando il registro sarà riattivato).",
              "",
              "PUNTI FERMI (verificati) DA NON SBAGLIARE",
              "- La proprietà corporate estera NON esclude la startup innovativa: il requisito 'persone fisiche in maggioranza' è stato abrogato nel 2013. Le esclusioni vere sono il divieto di distribuire utili, l'asticella d'innovazione e lo status MPMI.",
              "- La S.r.l.s. (semplificata) NON è utilizzabile con un socio persona giuridica: serve la S.r.l. ordinaria.",
              "- Socio unico = atto unilaterale → capitale versato al 100% all'atto (non 25%); può andare all'organo amministrativo o su conto escrow del notaio, quindi non serve un conto della società prima dell'iscrizione.",
              "- Deposito al Registro Imprese entro 10 giorni (non 20); la società esiste solo con l'iscrizione.",
              "- Documenti USA: apostille (Secretary of State dello Stato) + traduzione giurata. L'EIN non è un requisito italiano; servono i codici fiscali italiani di parent (AA5/6, Centro Operativo di Pescara) e amministratori.",
              "- Dividendi verso la parent USA: ritenuta convenzionale 5% (≥25% voti da ≥12 mesi) o 15%, mai 0%; la direttiva madre-figlia UE non si applica.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "metodo_ingresso_italia",
    "Metodo per orientare una società USA che valuta come entrare nel mercato italiano: quali " +
      "domande fare per capire il caso reale, e come usare il tool `valuta_ingresso_italia` per " +
      "raccomandare il veicolo giusto e proporre l'incarico allo studio.",
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Orienta una società USA che vuole entrare in Italia. NON dare per scontato che serva una S.r.l.: prima capisci il caso reale, poi lascia che il tool `valuta_ingresso_italia` raccomandi il veicolo giusto tra posizione IVA (rappresentante fiscale), ufficio di rappresentanza, branch (stabile organizzazione) e S.r.l. controllata. Parli a nome di uno studio di commercialisti: l'obiettivo è dare un quadro chiaro e proporre, alla fine, un incarico allo studio come modo per procedere. Ogni output è una BOZZA e la decisione resta del cliente.",
              "",
              "PROCEDURA",
              "0) Stato. Leggi `studio/ingresso/<cliente>.md` se esiste (vedi `convenzione_studio_db`) e riprendi; altrimenti parti dall'intervista.",
              "1) Intervista (una domanda alla volta, tono semplice, niente gergo): ",
              "   a. Qual è l'obiettivo in Italia? (vendere, aprire operazioni, assumere, testare il mercato, detenere IP...)",
              "   b. Cosa farete concretamente in Italia? → mappa su `attivita`: solo_vendite / promozione / operazioni / holding_ip / rd.",
              "   c. Avrete una presenza fisica? (nessuna / magazzino / ufficio / punto vendita) → `presenza_fisica`.",
              "   d. Assumerete personale in Italia? → `assumera_personale`. Qualcuno concluderà contratti in Italia in nome vostro? → `conclude_contratti_in_italia`.",
              "   e. Dove vivono e da dove gestiranno i founder? (USA / Italia / misto) → `residenza_founder` (determina il rischio esterovestizione).",
              "   f. Volete rimpatriare gli utili al parent? → `distribuira_utili`. Vi serve la responsabilità limitata? → `vuole_responsabilita_limitata`.",
              "   g. È un test di mercato o una presenza stabile? → `orizzonte`. E qual è l'entità USA esistente? → `us_entity`.",
              "   Lascia vuoti i campi che il cliente non sa: il tool ragiona comunque e segnala cosa manca.",
              "2) Chiama `valuta_ingresso_italia` con quanto raccolto. Restituisce: riepilogo situazione, veicolo consigliato con motivi e alternative, risposte alle domande chiave, piano di partenza, bozza di proposta di incarico.",
              "3) Presenta con chiarezza: prima il riepilogo della loro situazione (falli sentire capiti), poi l'opzione consigliata e il perché, le alternative e quando cambiano, e le risposte alle loro domande. Evidenzia i punti ⚠️ da verificare (soglia stabile organizzazione, esterovestizione, ritenute) come cose da confermare col professionista, non come certezze.",
              "4) Se il veicolo consigliato è la S.r.l., prosegui con `costituzione_controllata_usa` per la roadmap completa; per gli altri veicoli, elenca i primi passi del piano.",
              "5) Chiudi con la proposta di incarico (bozza): è il modo per procedere con lo studio. Ricorda che l'adeguata verifica antiriciclaggio (tipicamente rafforzata, struttura estera) va completata prima del conferimento, e che la decisione di conferire l'incarico resta del cliente. Non fare offerte ingannevoli o pressanti (art. 44 Codice Deontologico).",
              "6) Aggiorna `studio/ingresso/<cliente>.md` con la situazione, il veicolo consigliato e lo stato della proposta.",
              "",
              "PUNTI FERMI (verificati) DA NON SBAGLIARE",
              "- Il perno è la stabile organizzazione (art. 162 TUIR): 'solo vendite' o 'ufficio di rappresentanza' reggono SOLO finché non c'è una S.O.; oltre quella soglia scatta l'imposta italiana sui redditi.",
              "- Una società USA (extra-UE) NON può fare l'identificazione diretta IVA: per vendere in Italia senza struttura serve un rappresentante fiscale (responsabile in solido).",
              "- L'ufficio di rappresentanza è solo promozione/ausiliario: niente vendite/contratti, o diventa una S.O. occulta tassabile retroattivamente.",
              "- Branch = stessa società USA (nessuno scudo di responsabilità, ma nessuna ritenuta sul rimpatrio e perdite verso il parent). S.r.l. = soggetto separato (responsabilità limitata, dividendi con ritenuta 5%/15%).",
              "- Founder che vivono e gestiscono dall'Italia → rischio esterovestizione (la società USA vista come residente in Italia, art. 73 TUIR): di norma meglio una società italiana con governance documentata.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
