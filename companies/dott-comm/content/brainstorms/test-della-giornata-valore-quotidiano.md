---
title: Il test della giornata — i nostri tool reggono il quotidiano del commercialista?
status: draft
owner: ttassi
updated: 2026-07-07
tags: [product, valore, giornata-tipo, tools, audit, esplorazione]
---

# Il test della giornata — i nostri tool reggono il quotidiano?

> Brainstorm — exploratory, not a decision. Quando si risolve, ADR in
> `decisions/` e fold in `knowledge/`.

## Problem / question

Abbiamo scaffolding solido (auth, billing, DB, deploy) e un primo set di tool
costruito tatticamente per il crunch del 20/7. La domanda ora è il **valore**:
se seguiamo un commercialista in una giornata *normale* (non il 20/7), in
quanti momenti aprirebbe Claude + Dott. Comm.? E dove sta il lavoro che
nessuno vuole fare — basso valore unitario, ripetitivo, manuale — che
potremmo togliergli di dosso?

Metodo: il **test della giornata**. Prendo la giornata/mese/anno tipo dal
[problem-space, cap. 10](../knowledge/problem-space.md) e, momento per
momento, segno se un tool attuale si accende. Poi audit onesto dei 5 tool
spediti, e inventario del lavoro "schifoso ma ripetitivo" ordinato per
frequenza × fattibilità client-local (ADR 0003: zero integrazioni, zero stato
fiscale server-side).

## 1. La giornata al microscopio — dove si accendono i tool attuali

Legenda: ✅ un tool attuale copre il momento · 🟡 copre in parte / in forma
debole · ❌ nessun tool.

### Titolare

| Momento | Attività | Tool oggi |
|---|---|---|
| 8:00–9:30 | **Rassegna stampa + triage PEC/email notturne.** Il "control loop" della giornata: qui entrano atti e scadenze | ❌ — il buco più grave: niente per classificare un atto e calcolarne il termine perentorio |
| Mattina | Appuntamenti, firme, **review dell'output dei collaboratori** | ❌ (S6 `controlli-pre-invio` a catalogo, non costruita) |
| Tutto il giorno | **Il flusso di domande spot** — "posso scaricare questa cena?", "mi conviene l'auto aziendale?", "quanto mi resta se fatturo 60k da forfettario?" — 1–3 h/giorno, frammentate, non fatturate | ❌ — la superficie LLM-native più grande della professione, scoperta |
| Sera | Deep work (pareri, operazioni, contenzioso) | ❌ come Dott. Comm. (Claude generico aiuta; le banche dati sono il moat altrui) |

### Collaboratore contabile

| Momento | Attività | Tool oggi |
|---|---|---|
| Giorni 1–10 | Chiusura mese precedente: import SDI, registrazioni, **eccezioni di classificazione**, banche | ❌ (S4 `triage-fatture`, S1 `riconcilia-banca` a catalogo; il gestionale fa la base) |
| Giorni 1–10 | **Rincorsa documenti** del proprio portafoglio | 🟡 `raccolta_documenti` esiste ma: checklist statiche, stato imboccato a mano, un cliente per volta |
| Giorni 10–16 | Liquidazioni IVA, F24, **comunicazione importi ai clienti** + ping-pong "pagato?" | 🟡 `comunica_versamenti` copre la bozza singola; manca la campagna batch e il tracking |
| Flusso costante | **Avvisi bonari / comunicazioni di irregolarità** (decine/anno anche in studi piccoli, termine 30 gg, spesso è un F24 mal registrato) | ❌ (S2 a catalogo) |
| Su evento | Cliente ha pagato tardi → **ravvedimento** | ✅ `ravvedimento` — l'unico tool davvero always-on del set |

### Segreteria

| Momento | Attività | Tool oggi |
|---|---|---|
| Continuo | Smistamento posta/PEC, **archiviazione ricevute Entratel**, presidio scarti | ❌ (W2 a catalogo — e le ricevute sono *file locali*: aggredibile oggi) |
| Continuo | Registro **deleghe / certificati / firme / PEC in scadenza** | ❌ (W3 — oggi a memoria e post-it) |
| Su evento | Onboarding cliente, pratiche, lettere d'incarico, fascicolo antiriciclaggio | ❌ (il tool `onboarding` attuale è l'onboarding *del prodotto*, non del cliente dello studio — L4 resta scoperta) |

**Verdetto del test:** su ~12 momenti ricorrenti della giornata di studio, i
tool attuali ne toccano **2** (ravvedimento; comunicazione versamenti in forma
singola), entrambi a frequenza mensile o su evento — **nessuno quotidiano**.
Il set attuale è un **prodotto da campagna** (eccellente per il 20/7, si
riaccende al 30/11 e in miniatura ogni 16 del mese), non ancora un prodotto da
giornata. Dopo il 20/8 non c'è un motivo *quotidiano* per aprirci.

## 2. Audit onesto dei 5 tool spediti

| Tool | Valore reale | Il punto debole onesto |
|---|---|---|
| `prospetto_acconti` | ⭐⭐⭐ **adesso**: sostituisce la sessione Excel per cliente nei giorni in cui le ore non esistono; la riga di rischio previsionale è genuinamente utile e nessun calcolatore gratuito la fa così | Event-shaped: dorme dal 21/8 al ~15/11. E per i dichiarativi *già finalizzati* il gestionale i numeri li ha già — il nostro valore è il what-if (rate, 20/7 vs 20/8, previsionale) e i clienti non ancora chiusi |
| `ravvedimento` | ⭐⭐ ricorrente tutto l'anno, si integra nella conversazione, può fare batch | Commodity: calcolatori gratuiti ovunque (incluso AdE). Il valore è *dove* vive (in chat, col contesto cliente, con la bozza di messaggio annessa), non il calcolo in sé |
| `estrai_documenti` | 🟡 plumbing corretto (il determinismo su date/importi/check-digit è la cosa giusta da fare server-side) | **Il valore percepito va a Claude, non al tool**: l'estrazione la fa il client, noi validiamo. Non è un pilastro di valore vendibile; è infrastruttura + telemetria del flusso |
| `raccolta_documenti` | 🟡 il target giusto — *il* target (10–20% del tempo di studio) | Implementazione sottile: checklist fisse per 5 tipi-cliente, `documenti_presenti` imboccato a mano, un cliente per chiamata. **La parte dura del problema è sapere cos'è arrivato** (sparso tra email/WhatsApp/carta) — e oggi la lasciamo tutta all'utente |
| `comunica_versamenti` | 🟡 il gancio mensile potenzialmente migliore (ogni 16) | Oggi è un mail-merge: Claude nudo scriverebbe quel messaggio senza tool. Il valore arriva con: batch sul portafoglio, tracking inviato/confermato su file, verifica quietanze |

Da questo audit esce un **principio di design** che vale la pena fissare:

> **Un tool gated si deve guadagnare il gate.** Ciò che giustifica una
> chiamata a pagamento rispetto a Claude nudo è il **determinismo a peso
> legale**: termini perentori, sanzioni, interessi, rate, soglie, codici
> tributo, check digit. La prosa (solleciti, comunicazioni) da sola non regge
> il gate — Claude la fa gratis. I tool forti del set (prospetto, ravvedimento)
> rispettano il principio; i due loop oggi lo violano a metà e vanno
> irrobustiti col *calcolo* e con lo *stato*, non con più template.

Corollario client-local (ADR 0003): la **percezione di magia** ("sa cosa mi
manca", "ha letto la PEC") non deve venire dal server ma dal client — Claude
Code che scandisce la cartella documenti o l'export della casella. Servono
**convenzioni file + prompt MCP** che orchestrino questa parte, non nuove
tabelle nostre.

## 3. I tre buchi quotidiani

I momenti a più alta frequenza della giornata sono esattamente quelli scoperti:

1. **Il triage degli atti (PEC / cassetto fiscale / raccomandate).** Il
   problem-space lo chiama "the single most obvious always-on agent watchdog
   in the entire profession". Non serve aspettare l'integrazione PEC (T2): la
   versione *paste-in* funziona oggi — incolli l'atto (o il PDF), il tool lo
   classifica e **calcola il termine perentorio** (30/60/90 gg, sospensione
   feriale d'agosto, +90 se adesione, finestre di rateazione, sanzioni ridotte
   1/3) e propone i prossimi passi. La deadline arithmetic è deterministica,
   ha peso legale, il costo di un errore umano è illimitato: è il tool che
   *merita il gate* più di ogni altro. Trigger: quotidiano (il triage mattutino).
2. **Il flusso di domande spot** (1–3 h/giorno del titolare). ~60% sono
   pattern ricorrenti e molte sono *calcoli*: simulazione forfettario
   (coefficienti di redditività, contributi, netto), dividendi vs compenso
   amministratore, fringe benefit auto (tabelle ACI), deducibilità per
   categoria di costo, TFM/TFR. Una famiglia di micro-calcolatori
   deterministici (stesse fondamenta di `lib/fiscal/`, costanti `DA
   VERIFICARE`) trasforma "ti richiamo" in una risposta in 30 secondi con i
   numeri giusti. Ogni singolo calcolo vale poco — il flusso vale ore al giorno.
3. **Lo scadenzario** — "cosa scade e a che punto siamo?" è la domanda di
   apertura di ogni giornata di studio, e il problem-space lo indica come "the
   central data model any agent system must own or integrate with". In forma
   client-local: un tool `scadenze_cliente` che dagli attributi (regime, forma
   societaria, ISA, dipendenti, retail, immobili...) **deriva gli adempimenti
   applicabili e le prossime scadenze**, e una convenzione file (il famoso
   `studio-db` di T1) che Claude Code genera e mantiene. È anche il substrato
   che rende `raccolta_documenti` e `comunica_versamenti` delle campagne vere.

## 4. Inventario del lavoro schifoso-ma-ripetitivo

La richiesta esplicita: cose a basso valore unitario ma ripetitive e odiate.
Ordinate per frequenza × fattibilità client-local oggi (zero integrazioni).
"Gest.?" = il gestionale lo copre già in buona parte?

| Lavoro | Freq. | Chi lo odia | Gest.? | Fattibile oggi (ADR 0003)? |
|---|---|---|---|---|
| Triage atti + calcolo termini | Quotidiana | Tutti | No | ✅ paste-in |
| Domande spot ricorrenti (calcoli) | Quotidiana | Titolare | No | ✅ calcolatori puri |
| Presidio ricevute/scarti Entratel (W2) | Quotidiana nei picchi | Segreteria | No (file locali DT) | ✅ skill su cartella locale |
| Rincorsa documenti con stato *vero* | Mensile + campagne | Collaboratore | No | ✅ scan cartella/inbox export via client |
| Campagna del 16 (importi→messaggi→"pagato?") | Mensile | Collaboratore/segreteria | Calcola sì, comunica no | ✅ batch + file di stato |
| Registro scadenze accessi: deleghe 4 anni, F&C 2, certificati Entratel, firme, PEC (W3) | Continuo, silent failure | Segreteria | No | ✅ file convention + derivazione |
| Fascicolo antiriciclaggio: adeguata verifica, titolare effettivo, risk score, refresh | Ogni onboarding + refresh | Tutti ("pure burden") | Moduli odiati | ✅ checklist + assemblaggio bozze |
| Lettere d'incarico / preventivi / rinnovi mandati | Onboarding + annuale | Titolare | No | ✅ template + parametri |
| Verbali assemblea approvazione bilancio (batch aprile) | Stagionale, seriale | Segreteria societaria | No | ✅ template |
| Squadrature CU ↔ 770 ↔ F24 | Stagionale (marzo, ottobre) | Collaboratore | Parziale | ✅ su export |
| Avviso bonario: fondato o no? + bozza CIVIS | Costante (decine/anno) | Collaboratore | No | ✅ paste-in + storico F24 da file |
| IMU: delibere comunali + calcolo + F24 | 2×/anno | Segreteria | Parziale | 🟡 serve lookup aliquote MEF (dato pubblico) |
| Parcellazione dello studio + solleciti propri ("il calzolaio con le scarpe rotte") | Mensile | Titolare | Male | ✅ da scadenzario-lavoro-fatto |
| Circolare di studio segmentata | 1–4/mese | Titolare | No | ✅ da testo norma + attributi clienti |
| Monitoraggio crediti FPC | Annuale (panico dicembre) | Iscritto | No | ✅ file convention banale |

Nota su cosa NON inseguire ora: tutto ciò che compete col gestionale sul suo
terreno (registrazione base, liquidazioni) o che richiede canali regolamentati
(invio F24, cassetto fiscale, PSD2) resta dietro i gate del catalogo — qui
l'attrito esterno domina e il valore marginale nostro è basso finché non
abbiamo la fiducia guadagnata dal wedge.

## 5. Priorità proposta (post-20/7)

Il criterio: **frequenza del trigger** (quotidiano > mensile > stagionale) ×
**diritto al gate** (determinismo a peso legale) × **zero attrito esterno**.

1. **`triage_atto`** — classificazione + termini perentori + opzioni. Il
   rules engine dei termini è il gemello di `acconti.ts`/`ravvedimento.ts`:
   puro, testabile, costanti `DA VERIFICARE`. Trigger quotidiano, costo di
   errore illimitato, nessun concorrente nel gestionale. *Il prossimo tool.*
2. **`scadenze_cliente` + convenzione `studio-db`** — attributi → adempimenti
   → scadenzario file. Sblocca la forma-campagna di L1/L2 e i watchdog W3.
3. **Upgrade dei due loop a campagne**: `raccolta_documenti` con array di
   clienti + prompt MCP che fa scandire al client la cartella documenti per
   derivare `documenti_presenti`; `comunica_versamenti` batch sul portafoglio
   con file di stato inviato/confermato. (Il 16 del mese diventa *il* rito.)
4. **Famiglia domande-spot**: `simula_forfettario`, `dividendi_vs_compenso`,
   `costo_benefit_auto`, `deducibilita` (lookup). Piccoli, puri, componibili.
5. **W2 `ricevute-scarti`** come skill sui file locali del Desktop Telematico
   + **W3 registro accessi** su studio-db. I watchdog sono la categoria che
   nessun software fa bene; questi due non aspettano nessun G-accessi.
6. **`avviso_bonario`** (S2 in forma paste-in) — appena il triage atti c'è,
   questo è il follow-up naturale: stessa superficie, valore immediato.
7. Poi il lotto stagionale/AML: fascicolo antiriciclaggio, lettere d'incarico,
   verbali, squadrature, parcellazione studio, circolare segmentata.

Il filo: passare da "prodotto da campagna" (20/7) a "prodotto da giornata"
(triage mattutino + domande spot + scadenzario) tenendo i riti mensili (il 16)
come spina dorsale della retention.

## Open questions

- **La casella PEC in forma paste-in è abbastanza?** Il triage atti manuale
  (incolla il testo) cattura il valore del calcolo termini ma non il presidio
  always-on (W1 pieno richiede T2/IMAP). Quanto del valore sta nel calcolo vs
  nel monitoraggio? Da validare col pilota.
- **I micro-calcolatori delle domande spot**: costanti/tabelle (ACI, aliquote
  INPS gestioni, coefficienti ATECO) cambiano ogni anno — chi le tiene
  aggiornate e come le versioniamo? (Stesso problema di `constants.ts`, scala
  ×10.)
- **`estrai_documenti`**: teniamo il posizionamento plumbing o lo fondiamo
  dentro i tool che lo usano (prospetto, triage) per ridurre la superficie
  percepita come "a pagamento ma non fa niente"?
- **Convenzione `studio-db`**: formato file (markdown? CSV? JSON?) e schema
  minimo — serve deciderlo *prima* di costruire campagne e watchdog che ci
  scrivono sopra. Candidato ADR.
- **Confine col consulente del lavoro** nelle domande spot ("quanto costa un
  dipendente a 1.500 netti?" è la domanda spot per antonomasia ma è materia
  paghe): rispondere con disclaimer o non rispondere?

## Leaning toward

Il set attuale ha vinto la battaglia giusta (il wedge del 20/7 è reale e va
cavalcato fino al 20/8), ma **non supera il test della giornata**: 2 momenti
su 12, nessuno quotidiano. La mossa successiva non è aggiungere altri template
— è comprare i tre trigger quotidiani: **triage atti con calcolo termini**
(il tool che più si merita il gate), **scadenzario derivato client-local**
(il keystone T1 in forma file), **micro-calcolatori per le domande spot**.
E promuovere i due loop da template a campagne con stato su file, dove la
"magia" (sapere cos'è arrivato) la fa il client scandendo le cartelle dello
studio, come vuole ADR 0003. Principio da portare in ogni review di nuovo
tool: *un tool gated si guadagna il gate col determinismo a peso legale, non
con la prosa.*
