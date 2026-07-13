---
title: Costituire una S.r.l. italiana controllata da una società USA
status: draft
owner: pvalfre
updated: 2026-07-10
tags: [costituzione, srl, socio-estero, usa, startup-innovativa, apostille, cross-border, area-05]
---

# Costituire una S.r.l. italiana controllata da una società USA

_Reference doc a supporto del tool `costituzione_controllata_usa` e del prompt
`metodo_costituzione_controllata_usa`. È la variante "socio unico persona
giuridica estera (USA)" del generico *Costituzione di società* dell'area 05 del
[problem-space](./problem-space.md): più dura per il layer estero (apostille,
traduzioni giurate, codice fiscale per non residenti) e per la fiscalità
cross-border USA→Italia._

> **BOZZA.** Ogni passo qui è materiale per una bozza assistita, non consulenza
> legale/fiscale: i passaggi notarili e fiscali vanno confermati con notaio e
> consulente. Le voci marcate **DA VERIFICARE** poggiano su fonti secondarie o
> su un'area normativa in movimento; le voci **VERIFICATO** sono state riscontrate
> su fonte ufficiale/primaria nella ricerca del **2026-07-10** (fan-out di 6
> ricerche mirate). Disciplina di provenienza analoga al registro costanti
> ([ADR 0011](../decisions/0011-registro-costanti-fiscali-provenienza.md)).

## Il punto che ribalta l'assunto di partenza

L'assunzione comune ("se è USA-owned non può essere startup innovativa per via
della proprietà") è **falsa**. Il requisito che imponeva alle persone fisiche di
detenere la maggioranza (ex art. 25 c.2 **lett. a** D.L. 179/2012) è stato
**abrogato dal D.L. 76/2013 (conv. L. 99/2013)**: una S.r.l. interamente
controllata da una corporation USA **non è esclusa** dallo status per la
compagine proprietaria. Le esclusioni vere sono **pratiche**: il divieto
assoluto di distribuire utili (incompatibile con la controllata che rimpatria
dividendi al parent), l'asticella d'innovazione e lo status MPMI. — VERIFICATO
(Normattiva art. 25, testo vigente; ODCEC Milano Quaderno 56).

## Fase 0 — Decisioni preliminari

- **Forma: S.r.l. ordinaria.** La **S.r.l.s.** è riservata alle sole persone
  fisiche (art. 2463-bis c.c.): con socio persona giuridica estera **non è
  utilizzabile**. — VERIFICATO
- **Capitale.** Minimo €10.000; ammesso €1–€9.999,99 ma solo in denaro, versato
  per intero, con riserva legale di 1/5 degli utili fino a €10.000 (art. 2463).
  — VERIFICATO
- **Versamento 100% all'atto.** Socio unico = atto unilaterale → il capitale in
  denaro si versa **per intero** al momento dell'atto (art. 2464 c.4), non il
  25%. Può andare all'organo amministrativo o su **conto escrow del notaio**
  (Massima 148 Consiglio Notarile di Milano): non serve un conto della società
  prima dell'iscrizione. — VERIFICATO
- **Reciprocità Italia-USA.** Soddisfatta dal Trattato di amicizia, commercio e
  navigazione (L. 385/1949) + WTO; il notaio la riscontra sull'elenco MAECI al
  momento dell'atto. — VERIFICATO (check MAECI puntuale: DA VERIFICARE)
- **Oggetto e ATECO** (classificazione **ATECO 2025** in vigore — DA VERIFICARE
  il codice puntuale) e **governance** (amministratore anche non residente,
  ammesso, con CF italiano obbligatorio).

## Fase A — Documenti dalla capogruppo USA (apostille + traduzione giurata)

Gli USA aderiscono alla **Convenzione dell'Aia 1961**: i documenti pubblici USA
vanno **apostillati** (dal **Secretary of State** dello Stato che li emette), non
legalizzati in via consolare, e accompagnati da **traduzione giurata/asseverata**
in italiano (giuramento davanti a cancelliere del Tribunale / Giudice di Pace /
notaio; in alternativa il notaio o il Consolato certificano la traduzione). —
VERIFICATO (HCCH; Ambasciata d'Italia a Washington; Prefettura/Interno).

Set tipico (variabile per notaio e per Stato USA — DA VERIFICARE la lista
puntuale col notaio): **Certificate of Incorporation**, **Certificate of Good
Standing**, **bylaws**, **board resolution** che autorizza la costituzione e
nomina il firmatario, e **procura speciale** se si firma da remoto — via (a)
notary public USA + apostille + traduzione, o (b) **procura consolare** presso il
Consolato italiano negli USA (già in forma italiana, senza apostille/traduzione).
Il firmatario si identifica col **passaporto**. L'**EIN non è un requisito
italiano**. — VERIFICATO.

## Fase B — Identificativi italiani

- **Codice fiscale della parent USA** (socio): modello **AA5/6** all'Agenzia
  delle Entrate — **Centro Operativo di Pescara**, con documentazione di
  esistenza dell'ente. Serve per indicare il socio nell'atto/ComUnica. —
  VERIFICATO
- **Codice fiscale degli amministratori non residenti**: obbligatorio per
  l'iscrizione al Registro Imprese/REA (Circ. MISE 3668/C, dal 1/4/2014); modello
  **AA4/8** tramite delegato in Italia o Consolato. — VERIFICATO
- **Firma digitale** per chi sottoscrive ComUnica (o delega al notaio/
  intermediario). Blocco pratico per l'amministratore estero: serve prima il CF;
  **SPID/CIE di norma non disponibili ai non residenti** → via CA con
  video-riconoscimento su passaporto. — DA VERIFICARE (disponibilità per CA)

## Fase C — Atto notarile e costituzione

- **Atto pubblico notarile** (art. 2463, forma ad substantiam). Disponibile anche
  **in videoconferenza** (D.lgs. 183/2021, utilizzabile con parti all'estero) ma
  **solo per conferimenti in denaro**: la natura impone l'atto in presenza. —
  VERIFICATO
- **Deposito al Registro Imprese entro 10 giorni** a cura del notaio (termine
  **dimezzato da 20 a 10** dalla L. 12/2019). La società **esiste solo con
  l'iscrizione**. — VERIFICATO
- **PEC della società** indicata nella domanda di iscrizione (senza, iscrizione
  sospesa; registrazione gratuita). — DA VERIFICARE (a livello di articolo: art.
  16 c.6 D.L. 185/2008; obbligo VERIFICATO via Unioncamere)

## Fase D — Adempimenti post-costituzione

- **Partita IVA** dentro **ComUnica** (contenuto AA7/10 + RI + INPS + INAIL),
  non un AA7/10 separato. — VERIFICATO
- **PEC personale dell'amministratore**, distinta da quella della società (art. 1
  c.860 **L. 207/2024**, mod. **D.L. 159/2025**; termine 31/12/2025).
  L'amministratore unico non residente è nel perimetro. — VERIFICATO (sanzione
  €206–€2.064: DA VERIFICARE)
- **Titolare effettivo** al Registro Imprese entro 30 gg dall'iscrizione (DM
  55/2022), via DIRE/Telemaco. **Area in movimento**: al 2026-07-10 il registro è
  ancora **sospeso** (Consiglio di Stato); la **CGUE 21/5/2026 (C-684/24 e
  C-685/24)** ha dato il via libera, riattivazione imminente ma non perfezionata
  → **monitorare MIMIT/Unioncamere** per il nuovo termine. Catena: titolare
  effettivo = persona fisica con >25% della parent USA; in mancanza, gli
  amministratori (art. 20 D.Lgs. 231/2007). — DA VERIFICARE (status) / VERIFICATO
  (criteri catena)
- **Conto corrente operativo**: lo step **più lento**; KYC/adeguata verifica
  rafforzata su società interamente estera. Non serve per depositare il capitale
  (già versato all'atto). — DA VERIFICARE (bottleneck: fonti secondarie)
- **Adeguata verifica antiriciclaggio dello studio** al conferimento (artt.
  17-19 D.Lgs. 231/2007; Regole Tecniche CNDCEC gen. 2025) — struttura
  cross-border → profilo tipicamente **rafforzato**. — VERIFICATO

## Fase E — Fiscalità cross-border (consulenza)

Flag da presidiare (non consulenza definitiva):

- **Dividendi alla parent USA**: ritenuta convenzionale **5%** (parent con ≥25%
  dei voti da ≥12 mesi) o **15%** — la Convenzione Italia-USA (firmata 1999, in
  vigore 2009, L. 20/2009) **non prevede lo 0%**. Senza trattato: 26% domestico
  (art. 27 DPR 600/73); la **direttiva madre-figlia UE non si applica** (parent
  extra-UE). Servono Form 6166 e prova del beneficiario effettivo. — VERIFICATO
- **Interessi** max 10%; **royalties** 0% (diritti d'autore) / 5% (software e
  attrezzature) / 8% (altri). — VERIFICATO
- **Transfer pricing** (art. 110 c.7 TUIR; D.M. 14/5/2018): Master File +
  Documentazione Nazionale (Provv. AdE 23/11/2020) per la penalty protection. —
  VERIFICATO
- **Stabile organizzazione occulta / esterovestizione** (art. 162 TUIR): la
  governance concreta è decisiva. — VERIFICATO
- **IRES 24% + IRAP 3,9%** base (aliquota regionale da verificare; IRES premiale
  20% solo 2025). — DA VERIFICARE (IRAP regionale)

## Ammissibilità startup innovativa — il gate

La proprietà estera **non** è un ostacolo. Il gate (logica in
`code/src/lib/fiscal/costituzione-estera.ts`, `valutaStartupInnovativa`):

- **Esclusioni (hard fail):** distribuirà utili · attività prevalente di
  consulenza (L. 193/2024) · nata da fusione/scissione/cessione d'azienda · oltre
  60 mesi · oggetto non innovativo · non MPMI (L. 193/2024) · nessuno dei tre
  criteri d'innovazione.
- **Tre criteri (basta uno):** R&S ≥15%; ≥1/3 personale con dottorato/ricerca o
  ≥2/3 con laurea magistrale; privativa industriale o software registrato.
- **Via di costituzione: notarile.** Il "modello standard tipizzato" online
  presuppone soci persone fisiche con SPID/firma ed è stato **annullato dal
  Consiglio di Stato nel 2021**.
- **Permanenza (L. 162/2024):** 3 anni base, estendibili a 5 (uno di cinque
  requisiti), fino a 9 in scale-up — dettagli di estensione DA VERIFICARE.

## Fonti principali

Normattiva (D.L. 179/2012 art. 25; artt. 2463/2463-bis/2464/2330 c.c.); HCCH
Apostille; Ambasciata d'Italia a Washington; Prefettura/Interno (asseverazione);
Agenzia delle Entrate (AA5/6, AA7/10-ComUnica); Circ. MISE 3668/C; MIMIT +
Unioncamere (PEC amministratori, titolare effettivo); DM 55/2022; CGUE C-684/24 e
C-685/24; Convenzione Italia-USA (L. 20/2009); art. 110 c.7 TUIR + D.M.
14/5/2018; CNDCEC Regole Tecniche 2025. Elenco URL puntuale nei transcript della
ricerca 2026-07-10 (fan-out di 6 agenti); da ricitare per link se il doc passa da
`draft` ad `active`.

## Da completare (gate G-pilota)

- Validazione col professionista/notaio della lista documenti puntuale e della
  prassi CA per la firma digitale dei non residenti.
- Riverifica del **titolare effettivo** alla riattivazione (nuovo termine).
- Codice ATECO 2025 puntuale e aliquota IRAP regionale.
- Eventuale estensione a S.p.A. (oggi fuori scope) e alle varianti di conferimento
  in natura.
