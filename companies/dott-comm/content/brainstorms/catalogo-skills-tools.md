---
title: Catalogo skills & tools per l'MCP dei commercialisti
status: draft
owner: ttassi
updated: 2026-07-07
tags: [mcp, skills, tools, watchdogs, product, esplorazione]
---

# Catalogo skills & tools per l'MCP dei commercialisti

> Brainstorm — exploratory, not a decision. When this resolves, capture the
> outcome as an ADR in `decisions/` and fold it into `knowledge/`.

## Problem / question

Quali capability costruire per automatizzare il lavoro degli studi di
commercialisti italiani, e in che ordine? Seconda versione del catalogo,
ridisegnata alla luce di [`problem-space.md`](../knowledge/problem-space.md)
(la mappa completa della professione, area per area) e di
[`gestionali-mercato-e-api.md`](gestionali-mercato-e-api.md) (cosa è
integrabile davvero).

**Cosa è cambiato rispetto alla v1** (per tracciabilità):

- Nuove categorie **Loops** (i cicli di relazione col cliente, area 09) e
  **Watchdogs** (monitor always-on), prima assenti: il problem-space le
  identifica come il fossato competitivo e il pattern ricorrente più
  sottoservito.
- `registra-fatture` ridimensionata a `triage-fatture`: i gestionali già
  propongono le registrazioni dagli XML; il valore residuo è la coda di
  eccezioni, non la classificazione base.
- `studio-db` promossa da "primo tool comodo" a **keystone architetturale**
  (lo scadenzario è "the central data model any agent system must own").
- Criterio del valore rivisto: non solo dolore quotidiano — il **peak-shaving**
  (togliere lavoro meccanico da marzo–giugno e settembre–novembre) vale
  multipli del valore a carico medio.
- "Sforzo" ricalibrato per l'era autonoma: lo sviluppo lo fa una software
  factory autonoma, quindi i giorni-uomo di build non ordinano più le
  priorità; ordina l'**attrito esterno** (accessi, dati reali, validazione
  professionale, partnership).
- Recepito il capitolo Focus del problem-space (**il crunch del 20 luglio
  2026**, D.L. 89/2026): il suo Tier-0 wedge coincide con il nostro Track A
  e diventa la **prima campagna** del piano; aggiunta la skill S12
  `prospetto-acconti` che al catalogo mancava.

## Principi di design

Derivati dall'incrocio tra i nostri criteri v1 e le automation notes del
problem-space:

1. **Non competere col gestionale, completarlo.** Le aree 01–03 (contabilità,
   adempimenti, bilancio) sono in via di commoditizzazione da parte dei
   gestionali stessi (che già automatizzano il 40–70%). Il gap aggredibile è
   la colla tra i sistemi: eccezioni, quadrature, comunicazione, presidio.
2. **L'area 09 è il fossato.** I loop rincorri-comunica-conferma (documenti,
   versamenti, promemoria) sono dove gli studi affogano davvero — la sola
   raccolta documenti vale il 10–20% del tempo totale di studio — e sono
   strutturalmente rule-based.
3. **Human-in-the-loop by default.** Ogni output è una bozza che il
   professionista rivede; la responsabilità professionale resta sua. Il
   posizionamento è *assist-the-professional*, non *answer-the-client*
   (quest'ultimo è una decisione di prodotto rimandata, vedi open questions).
4. **Campagne, non task.** I workflow vanno modellati come campagne sul
   portafoglio clienti (raccolta documenti di massa, batch CU, stagione
   bilanci), non come task single-client: è così che lo studio lavora.
5. **Lo scadenzario è la spina dorsale.** La matrice cliente × adempimento ×
   scadenza × assegnatario × stato è il sistema operativo dello studio:
   possederla o integrarla batte l'automazione di qualunque singolo
   adempimento.
6. **Valore = quotidiano + peak-shaving.** Priorità a ciò che toglie lavoro
   dai picchi (marzo–giugno, settembre–novembre) e ai loop che girano ogni
   mese; le finestre di adozione realistiche sono agosto e fine dicembre.
7. **Il build costa ~zero, l'attrito è altrove.** Lo sviluppo lo fa una
   software factory autonoma: l'intero catalogo è costruibile in parallelo.
   Ciò che NON si comprime con più agenti: gli accessi esterni (API,
   credenziali, deleghe, partnership), i dati reali degli studi per testare,
   la validazione dei professionisti sulle bozze, la compliance. La
   prioritizzazione è quindi **valore / attrito esterno**, e la sequenza è
   fatta di gate di dipendenza e di apprendimento, non di capacità di
   sviluppo.

Distinzione operativa tra le categorie:

- **Skill** = procedura codificata (prompt + metodo + template), lavora su
  file che lo studio ha già. Nessuna dipendenza esterna: attrito minimo.
- **Loop** = ciclo deriva → notifica → escalation → conferma → registra,
  eseguito come campagna sul portafoglio. Parte in forma manuale (da file),
  diventa potente con `studio-db`.
- **Watchdog** = monitor always-on con costo di fallimento alto (termini
  perentori, scarti, scadenze di accesso). Oggi gestiti "a memoria e post-it".
- **Tool MCP** = connettore deterministico verso un sistema esterno o verso
  il DB proprietario.

## A — Skills di redazione e controllo

Ordinate per rapporto valore/attrito. Tra parentesi il riferimento all'area
del problem-space e la sua stima di quota rule-based. La colonna **Attrito**
misura ciò che la factory non comprime: dati reali per testare, sapere
professionale da codificare, validazione umana — non giorni di sviluppo.

| # | Skill | Input → Output | Valore | Attrito |
|---|---|---|---|---|
| S1 | `riconcilia-banca` — abbina estratto conto e contabilità (01, ~85%) | Estratto conto (CSV/Excel/PDF) + export partite aperte → abbinamenti proposti con confidenza + orfani con ipotesi e domande da girare al cliente | ⭐⭐⭐ mensile, "still a major time sink" anche con i moduli dei gestionali; obbligatoria al centesimo a bilancio | Basso-medio |
| S2 | `rispondi-avviso` — triage avvisi bonari e controlli formali (06, ~85%) | PDF comunicazione 36-bis/36-ter + dichiarazione + storico F24 → la contestazione è fondata? (spesso è un F24 mal registrato) + bozza istanza CIVIS o piano pagamento/rateazione | ⭐⭐⭐ flusso costante (decine/anno anche in studi piccoli), termine 30 gg, alto stress | Medio |
| S3 | `nota-integrativa` — prosa dal bilancio (03, ~70%) | Bilancio di verifica + nota anno precedente + fatti dell'anno → bozza nota (micro/abbreviata/ordinaria) con placeholder sui dati mancanti | ⭐⭐⭐ stagionale ma "classic LLM-assist target"; peak-shaving puro (marzo–maggio) | Medio |
| S4 | `triage-fatture` — eccezioni sul ciclo passivo (01, ~80%) | Registrazioni proposte dal gestionale + XML + storico per fornitore → coda di anomalie ordinata (detraibilità, reverse charge, competenza, cespiti) con proposta e motivazione | ⭐⭐ il gestionale fa la base; noi la coda che oggi consuma il collaboratore | Basso |
| S5 | `prep-pack-cliente` — brief per l'incontro periodico e per le banche (03/09, ~85% auto-assemblabile) | Contabilità aggiornata + bilanci storici → situazione riclassificata, indici, scostamenti spiegati, imposte forecast, talking points | ⭐⭐ ricorrente, sposta lo studio verso l'advisory; i "bank package" sono richiesti ogni anno | Basso |
| S6 | `controlli-pre-invio` — quadrature su liquidazioni e dichiarativi (01/02) | Export del periodo + modello compilato → torna/non torna riga per riga, incoerenze anno-su-anno, detrazioni potenzialmente mancanti | ⭐⭐ mensile (IVA) + stagionale (dichiarativi); riduce errori costosi | Medio |
| S7 | `estrai-documenti` — da PDF/foto a dati strutturati (01, il buco extra-SDI) | Ricevute, scontrini, fatture estere, contratti → tabella strutturata + lista illeggibili/dubbi | ⭐⭐ quotidiano; le fatture estere alimentano anche l'esterometro/TD17-19 | Medio |
| S8 | `atti-societari` — verbali e template (03/05, ~85%) | Dati società + tipo delibera → bozza verbale (approvazione bilancio, utili, nomine, compensi), convocazioni, lettere d'incarico | ⭐ stagionale/event-driven, ma sforzo quasi nullo | Molto basso |
| S9 | `ravvedimento` — calcolo e F24 correttivo (02, ~98%) | Importo e data originari + data pagamento → sanzioni ridotte per scaglione, interessi, F24 con codici tributo | ⭐ frequente, "trivially automatable" | Molto basso |
| S10 | `parsing-broker-rw` — report esteri/crypto per quadro RW/RT (04) | CSV/PDF di broker ed exchange → dati pronti per RW/RM/RT + credito d'imposta estero | ⭐⭐ nicchia in crescita, "a screaming automation need", domina il tempo di quelle pratiche | Medio |
| S11 | `circolare-studio` — dalla novità normativa alla comunicazione (04/09, ~70%) | Analisi della norma + segmentazione clienti → bozza circolare personalizzata per segmento | ⭐⭐ 1–4/mese, valore percepito alto; potenziata da W5 | Basso |
| S12 | `prospetto-acconti` — il calcolatore del versamento (02/F) | Numeri estratti (da gestionale/bozze F24/dichiarativo) → one-pager per cliente: saldo + 1° acconto al 20/7 vs 20/8 +0,80%; storico (40/60) vs previsionale **con la riga di rischio esplicita** (tolleranza 20%, sanzione 30%); piano rate (fino a 7 rate al 16/12, 4%, codici F24) | ⭐⭐⭐ **adesso** (crunch 20/7/2026) e ricorrente: stessa catena al 30/11 e a ogni saldo/acconto; sostituisce la sessione Excel per cliente nei giorni in cui le ore non ci sono | Minimo — aritmetica verificabile, regole pubbliche (D.L. 89/2026); la decisione resta umana |

## B — Loops di relazione col cliente

Il fossato (area 09). Tutti con la stessa forma: **deriva cosa serve →
notifica → escalation → conferma → registra**. Ognuno parte in "forma
manuale" (la checklist vive in un file dello studio) e diventa una campagna
automatica con `studio-db` (T1).

| # | Loop | Ciclo | Valore | Dipendenze |
|---|---|---|---|---|
| L1 | `raccolta-documenti` — il sollecito eterno | Checklist per cliente per ciclo (estratti conto, fatture estere, incassi, rimanenze, spese detraibili) → email/messaggi di sollecito con lista di cosa manca → escalation → registro di cosa è arrivato (che protegge anche la responsabilità dello studio) | ⭐⭐⭐ **il target a più alto ROI della professione**: 10–20% del tempo totale di studio; campagna di massa ad aprile–giugno | Forma manuale: nessuna. Piena: T1 |
| L2 | `comunica-versamenti` — F24 e importi da pagare | Importi calcolati → notifica con spiegazione in linguaggio semplice + F24 → promemoria a ridosso → conferma "pagato?" → verifica quietanza e archiviazione | ⭐⭐⭐ ogni 16 del mese + acconti/saldi; ~95% rule-based; il mancato pagamento incolpato allo studio è il failure mode classico | Forma manuale: nessuna. Verifica quietanze: T5 |
| L3 | `promemoria-scadenze` — reminder derivati dallo scadenzario | Attributi cliente → adempimenti applicabili → promemoria calendarizzati verso cliente e verso il team | ⭐⭐ diffuso, banale, sempre verde | T1 |
| L4 | `onboarding-cliente` — il flusso d'ingresso | Raccolta documenti iniziale → fascicolo antiriciclaggio (adeguata verifica, titolare effettivo) → lettera d'incarico → attivazione deleghe → anagrafica → scadenzario popolato | ⭐⭐ "the studio's most repetitive multi-system process"; concentrato a gennaio | T1; pratiche deleghe restano manuali finché non c'è T4/T5 |

## C — Watchdogs

Monitor always-on: ~90–95% rule-based, costo di fallimento alto o illimitato,
oggi affidati alla memoria. È la categoria dove un agente batte qualunque
software tradizionale già in commercio, perché richiede classificazione di
testo non strutturato + derivazione di regole.

| # | Watchdog | Cosa sorveglia | Valore | Dipendenze |
|---|---|---|---|---|
| W1 | `presidio-notifiche` — PEC + cassetto fiscale | Ogni atto notificato: rileva → classifica → **calcola il termine perentorio** (30/60/90 gg, sospensione feriale) → assegna. "The single most obvious always-on agent watchdog in the entire profession" | ⭐⭐⭐ il costo di un termine perso è illimitato | T2 (PEC); cassetto fiscale richiede T6 |
| W2 | `ricevute-scarti` — presidio invii Entratel | Ricevute di ogni trasmissione: scarto non visto = omessa dichiarazione; ritrasmissione entro 5 gg | ⭐⭐⭐ critico nei picchi di invio (31/10) | Le ricevute sono **file locali** del Desktop Telematico → aggredibile senza API esterne |
| W3 | `scadenze-accessi` — il registro delle infrastrutture | Deleghe (cassetto 4 anni, F&C 2), certificati Entratel, firme digitali, caselle PEC, polizza RC, crediti FPC | ⭐⭐ silent failure classico: una delega scaduta spegne le aree 01/02/06 senza rumore | T1 (registry) |
| W4 | `soglie-fiscali` — monitor sui numeri dei clienti | Soglia forfettari €85k, plafond esportatori, società di comodo, decadenza rateizzazioni | ⭐⭐ trasforma dati contabili in alert advisory | Dati contabili (export o T3/T4) |
| W5 | `norma-clienti` — dal decreto ai clienti impattati | Novità normative → matching sugli attributi del portafoglio ("questo decreto tocca 14 dei tuoi clienti") → alimenta S11 | ⭐⭐⭐ "flagship agent capability" per il problem-space; differenzia lo studio | T7 (fonti); T1 (attributi clienti) |

## D — Tools MCP (connettori)

| # | Tool | Cosa espone | Dipendenze / stato | Attrito |
|---|---|---|---|---|
| T1 | `studio-db` — **il keystone, come convenzione client-local** (rivisto, [ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md)) | Lo stesso data model — anagrafica clienti → adempimenti; scadenzario (cliente × adempimento × scadenza × assegnatario × stato); registro deleghe/scadenze di accesso; stato raccolta documenti; audit trail notifiche e conferme — ma **come file dello studio** che il client (Claude Code) mantiene, **non** una tabella nostra | Nessuna dipendenza e **zero PII sui nostri server** (GDPR ≈ zero). Abilita L1–L4, W3–W5 e le campagne in forma client-local. Diventa stato server-side solo dietro trigger concreti (watchdog always-on, client senza filesystem, multi-utente live) — vedi ADR 0003 | Basso — validare la convenzione file col primo pilota |
| T2 | `pec` — lettura e classificazione | Lista/lettura messaggi, classificazione (AdE, INPS, tribunale, clienti), estrazione allegati e atti | IMAP standard sui provider PEC: tecnicamente semplice, delicato per privacy. Abilita W1 | Basso-medio |
| T3 | `sdi-fatture` — fatture elettroniche | Fatture attive/passive per cliente e periodo | **Fatture in Cloud** (gruppo TeamSystem): unica API self-service documentata trovata, con MCP open source esistente ([`aringad/fattureincloud-mcp`](https://github.com/aringad/fattureincloud-mcp), 23 tool) da valutare per fork/riuso. Alternativa: API massiva AdE via intermediario | Medio (FiC) / Alto (AdE) |
| T4 | `gestionale` — lettura/scrittura sul gestionale di studio | Piano dei conti, anagrafiche, partitario; scrittura registrazioni (chiude il loop del data entry) | Nessuna API aperta trovata per TeamSystem Studio, Zucchetti Ago/Infinity, Profis, Passepartout (vedi [`gestionali-mercato-e-api.md`](gestionali-mercato-e-api.md)) → probabile partnership diretta col vendor | Alto |
| T5 | `banking` — quietanze e movimenti | Estratti conto e contabili via PSD2/CBI per S1 e la verifica pagamenti di L2 | Aggregatori PSD2 (Fabrick, Tink); consenso cliente da rinnovare | Alto |
| T6 | `cassetto-fiscale` — dati contribuente dall'AdE | F24 versati, dichiarazioni, comunicazioni, precompilata | Canali intermediari accreditati, vincoli normativi seri | Alto |
| T7 | `normativa` — fonti autorevoli | Ricerca con citazioni + **feed di novità per W5** (non solo search: diff normativi strutturati) | Fonti gratuite (Normattiva, GU, AdE) + licenze banche dati (Eutekne, Sole 24 Ore) | Medio |
| T8 | `telemaco-pratiche` — visure, DURC, depositi | Visure camerali, DURC, stato pratiche RI; in prospettiva depositi | Provider (OpenAPI.it/InfoCamere); "ideal MCP territory" per il problem-space (area 05) | Medio |

## Sequenza proposta (ipotesi, non decisione)

Con la software factory autonoma la sequenza non è un piano di sviluppo — la
factory può costruire l'intero catalogo in parallelo — ma una catena di
**gate**: cosa deve essere vero perché un pezzo possa andare in mano a uno
studio. Tre gate ordinano tutto:

- **G-pilota** — dati e feedback reali: uno studio che dà documenti veri e
  valida le bozze.
- **G-accessi** — credenziali e canali esterni: caselle PEC, API Fatture in
  Cloud, deleghe, fonti normative.
- **G-partnership** — accordi con vendor/intermediari: gestionali, API
  massiva AdE, PSD2.

Da cui i rilasci:

0. **La prima campagna: il cuneo del 20 luglio 2026** (capitolo Focus del
   problem-space, date verificate — D.L. 89/2026). Quattro capability del
   Track A in catena di dipendenza: **L1** (completeness check + sollecito
   mirato: "mancano estratto conto Q4 e fattura ACME") → **S7** (estrazione
   da export gestionale, bozze F24/dichiarativo, scansioni) → **S12**
   (prospetto acconti e rate) → **L2** (comunicazione personalizzata +
   assorbimento dell'onda di domande "rientro nella proroga? posso
   rateizzare?"). Zero integrazioni, draft-for-approval, deadline reale:
   il valore si dimostra nel momento acuto, e la stessa catena si ri-innesca
   al 30/11 (secondo acconto) e in miniatura a ogni 16 del mese. È il
   flywheel: il wedge senza setup guadagna la fiducia e gli accessi che
   rendono vendibili i Track C/D.
1. **Track A — nessun gate (build subito, tutto in parallelo).** Tutte le
   skills S1–S12 in v0, L1 e L2 in forma manuale (checklist e importi da
   file dello studio), T1 `studio-db`, W2 (le ricevute Entratel sono file
   locali del Desktop Telematico), W3 su T1. Escono dalla factory come bozze
   funzionanti; ciò che manca non è codice, è verifica sul campo.
2. **Track B — dietro G-pilota.** Le stesse capability promosse da v0 a
   "in produzione nello studio": il pilota decide cosa si affina (tuning di
   S1 su estratti conto veri, template di S3 col professionista, checklist
   di S6) e cosa si scarta. È il gate più lento e più prezioso: la fila
   davanti al pilota è **prima il cuneo del 20/7 (L1→S7→S12→L2)**, poi
   S1–S3.
3. **Track C — dietro G-accessi.** T2 (PEC) → accende W1, il watchdog più
   importante; T3 via Fatture in Cloud (fork/riuso dell'MCP esistente) dove
   il pilota lo usa; T7 → accende W5+S11. Attivabili in giorni una volta
   ottenute le credenziali: il lavoro è chiederle, non costruire.
4. **Track D — dietro G-partnership.** T4 (gestionale), T6 (cassetto
   fiscale), T5 (banking). Qui il collo di bottiglia sono i tempi
   commerciali/di accreditamento di terzi: vanno avviati **subito** in
   parallelo (le conversazioni costano poco e maturano lente), ma niente del
   prodotto deve dipendere dal loro esito.

Nota go-to-market dal ritmo della professione: la factory non ha stagioni ma
gli studi sì — le finestre di adozione reali restano **agosto e fine
dicembre** (gli unici momenti di slack in cui gli studi cambiano strumenti);
il valore va dimostrato sul picco successivo (settembre–novembre o
marzo–giugno).

## Open questions

- **API dei gestionali:** parzialmente risposto, vedi
  [`gestionali-mercato-e-api.md`](gestionali-mercato-e-api.md) — Fatture in
  Cloud sì; TeamSystem Studio, Zucchetti, Passepartout, Sistemi no o non
  verificabile. Resta da verificare `development.teamsystem.com` con un
  account/richiesta diretta.
- **Accesso alle fatture:** Fatture in Cloud copre solo i clienti che lo
  usano; per il resto serve API massiva AdE (intermediario) o provider di
  conservazione. Costi per studio da stimare.
- **Perimetro della responsabilità:** il posizionamento
  assist-the-professional è il default, ma il flusso quotidiano di domande
  spot dei clienti (1–3 h/giorno del titolare) è la superficie LLM-native più
  grossa — quando e come esporla verso il cliente finale è una decisione di
  prodotto, non tecnica (così anche il problem-space).
- **Deploy:** locale nello studio vs cloud — impatta GDPR, pricing,
  architettura, e la fattibilità di W2 (file locali del Desktop Telematico).
- **Pattern bozza→revisione→firma:** come si logga chi ha approvato cosa?
  Serve dal giorno 1 in ogni skill (audit trail in T1).
- **Studio pilota:** 1–2 studi veri — è il gate G-pilota, il collo di
  bottiglia reale dell'intero piano ora che il build non lo è più; la loro
  dotazione software decide anche l'ordine dei Track C/D.

## Leaning toward

**Il punto d'ingresso è il cuneo del 20 luglio 2026**: L1→S7→S12→L2 in
draft-for-approval, zero integrazioni, con una deadline vera a ~14 giorni e
un pitch che non ha bisogno di spiegazioni ("ti togliamo il 20 luglio dalle
spalle"). La factory costruisce comunque **tutto il Track A subito e in
parallelo** (skills v0, L1/L2 in forma manuale, T1, W2/W3): il costo di
build non è più un motivo per scegliere. Le scelte vere sono due: **la fila
davanti al pilota** (il cuneo per primo, poi S1–S3 — la revisione principale
rispetto alla v1, dove i loop mancavano e si puntava sulla classificazione
fatture che i gestionali stanno commoditizzando) e **quali conversazioni
esterne avviare oggi** (credenziali PEC e Fatture in Cloud subito,
partnership gestionali/AdE in parallelo senza dipenderne). `studio-db` (T1) resta il keystone: il data model dello
scadenzario, dei registri di scadenza e delle campagne. I watchdog sono la
categoria distintiva del prodotto (nessun gestionale li fa bene, il costo di
fallimento li rende facilmente prezzabili) e si accendono man mano che i
gate di accesso si aprono: W2 subito (file locali), W1 con la PEC.

## Stato build (2026-07-07)

Il **cuneo del 20 luglio è costruito in v0 e verificato end-to-end** nel server
MCP (`code/`): S12 `prospetto_acconti` (keystone), S7 `estrai_documenti`, L1
`raccolta_documenti`, L2 `comunica_versamenti`, più S9 `ravvedimento` e due MCP
prompt (metodo estrazione, tono comunicazione). Il rules engine fiscale vive in
`code/src/lib/fiscal/` (funzioni pure), con le costanti a peso legale
centralizzate e marcate `DA VERIFICARE`; ogni output è una *bozza*. Architettura
e scelta client-local: [ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md).

**Aggiornamento (stessa data) — i tre trigger quotidiani** (dal brainstorm
[test-della-giornata](test-della-giornata-valore-quotidiano.md)):

- **`triage_atto`** (S2/W1 in forma paste-in): classificazione a carico del
  client, termini perentori deterministici in `lib/fiscal/termini.ts` +
  `calendario.ts` (sospensione feriale, sospensione estiva bonari, +90 gg
  adesione, slittamenti festivi).
- **`scadenze_cliente`** (T1 client-local): attributi cliente → scadenzario
  derivato (`lib/fiscal/adempimenti.ts`).
- **L1/L2 promossi a campagne** sul portafoglio (dashboard + bozze per
  cliente) con stato nei file `studio/` — convenzione decisa in
  [ADR 0010](../decisions/0010-convenzione-studio-db-client-local.md) e
  documentata dal prompt `convenzione_studio_db`.

Tutto verificato con unit test sull'aritmetica + test end-to-end attraverso il
vero server MCP (97 test).

**Aggiornamento 2026-07-07 (sera) — registro costanti.** Le costanti fiscali
sono migrate al registro con provenienza e tabelle tempo-indicizzate
([ADR 0011](../decisions/0011-registro-costanti-fiscali-provenienza.md)), con
le 5 divergenze della verifica di massa applicate (tasso legale 1,60%, bonari
60/90 gg, scaglioni ravvedimento a trigger, festività 4/10, rate AdER
84/96/108); processo di ri-verifica: skill `/verifica-costanti` + doc
[manutenzione-costanti-fiscali](../knowledge/manutenzione-costanti-fiscali.md).
La **regola del gate** per i calcolatori futuri: si spedisce solo con costanti
registrate (fonte + `verificatoIl`); i grandi dataset (ACI, addizionali
comunali) non sono costanti — v0 chiede il dato all'utente.

**Aggiornamento 2026-07-07 — S13 `detrazione_sanitaria` (estrazione scontrini).**
Costruita la capability spese sanitarie, servita via MCP (tool + prompt-skill,
non repo-skill): tool gated `detrazione_sanitaria` (subtotali E1–E5, franchigia
unica €129,11 sul pool E1+E2, E3/E4/E5 senza franchigia, E25 come deduzione a
parte, tracciabilità, rimborsi, rateizzazione, foglio in CSV con schema colonne
configurabile) + prompt-procedura `metodo_estrazione_spese_sanitarie` (chiedi-e-
ricorda fonte documenti e destinazione calcolo, estrai con la vista, chiama il
tool, scrivi il foglio) + `convenzione_studio_db` estesa (`studio/spese-sanitarie/`).
Regole verificate sulle **istruzioni 730/2026** (periodo 2025), costanti
registrate (ADR 0011). 116 test verdi. Decisione:
[ADR 0012](../decisions/0012-estrazione-scontrini-detrazione-sanitaria.md); doc:
[spese-sanitarie-detrazione](../knowledge/spese-sanitarie-detrazione.md). Colma
la S7 sul lato medico-fiscale ed entra nella catena del 20/7 (la detrazione pesa
sul saldo).

Resta da fare: validazione col professionista (gate G-pilota), la famiglia
calcolatori domande-spot (proposta: `simula_forfettario` e
`dividendi_vs_compenso` gated, `deducibilita` come prompt ungated,
costo-dipendente rinviato — da decidere), il resto delle skill
S1–S6/S8/S10/S11 e i watchdog W2/W3.

**Aggiornamento 2026-07-10 — S14 `costituzione_controllata_usa` (area 05).**
Prima capability dell'area 05 (consulenza societaria): la roadmap per costituire
una **S.r.l. italiana interamente controllata da una società USA** (socio unico
persona giuridica estera). Tool gated + prompt `metodo_costituzione_controllata_usa`,
con dominio puro in `code/src/lib/fiscal/costituzione-estera.ts` (checklist per
fasi 0/A/B/C/D/E, gate `valutaStartupInnovativa`, tracce di bozza). Ogni passo è
**grounded** con `fonte` e flag `verificato`/`da_verificare` da un **fan-out di 6
ricerche mirate** su fonti ufficiali (Normattiva, AdE, Registro Imprese/MIMIT,
Notariato, HCCH, Convenzione Italia-USA), stessa disciplina del registro costanti
(ADR 0011). Correzioni emerse dalla ricerca: proprietà corporate estera **non**
esclude la startup innovativa (ex lett. a abrogata dal D.L. 76/2013 — l'esclusione
vera è il divieto di distribuire utili), deposito RI a **10 giorni**, capitale
**100%** all'atto per socio unico, S.r.l.s. esclusa, apostille+traduzione giurata
sui documenti USA, dividendi al parent 5%/15% (mai 0%), titolare effettivo in
riattivazione post-CGUE. Stato pratica in `studio/costituzioni/<societa>.md`.
Decisione: [ADR 0014](../decisions/0014-tool-costituzione-controllata-usa.md); doc:
[costituzione-controllata-usa](../knowledge/costituzione-controllata-usa.md). 128
test verdi. Resta il gate G-pilota (validazione con notaio) sulle voci
`da_verificare`.

**Aggiornamento 2026-07-10 — S15 `valuta_ingresso_italia` (advisor a monte, area 04/05).**
L'advisor che sta **prima** di S14: una società USA arriva con situazione +
obiettivo e il tool **valuta il caso reale e sceglie il veicolo giusto** tra
posizione IVA (rappresentante fiscale), ufficio di rappresentanza, branch
(stabile organizzazione) e S.r.l. — senza dare per scontata la S.r.l. Restituisce
riepilogo, raccomandazione (motivi + alternative + bandiere), risposte alle
domande chiave, piano di partenza e **bozza di proposta di incarico** dello studio
(l'Agent parla a nome di uno studio di commercialisti); instrada a
`costituzione_controllata_usa` quando vince la S.r.l. Dominio puro in
`code/src/lib/fiscal/ingresso-italia.ts` (gate `livelloStabileOrganizzazione`,
`raccomandaVeicolo`, FAQ, piano, proposta) + prompt `metodo_ingresso_italia`.
Grounded con **fan-out di 5 ricerche mirate** (Normattiva, AdE, Registro Imprese,
CNDCEC): perno = stabile organizzazione (art. 162 TUIR); USA extra-UE non può fare
identificazione diretta (serve rappresentante fiscale); founder in Italia →
esterovestizione (art. 73 TUIR); proposta d'incarico entro i vincoli di preventivo
(art. 9 DL 1/2012), adeguata verifica (art. 18 D.Lgs. 231/2007) e deontologia
(art. 44). Decisione: [ADR 0015](../decisions/0015-advisor-ingresso-italia-veicolo.md);
doc: [ingresso-mercato-italiano-usa](../knowledge/ingresso-mercato-italiano-usa.md).
142 test verdi.
