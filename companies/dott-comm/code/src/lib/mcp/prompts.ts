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
}
