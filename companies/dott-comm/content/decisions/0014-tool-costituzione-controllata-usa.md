---
title: Tool costituzione_controllata_usa — roadmap grounded per S.r.l. USA-owned
status: accepted
date: 2026-07-10
deciders: [pvalfre]
supersedes:
superseded-by:
tags: [mcp, tool, prompt, costituzione, srl, socio-estero, usa, startup-innovativa, area-05]
---

# 0014. Tool `costituzione_controllata_usa` — roadmap e bozze grounded per una S.r.l. controllata da società USA

## Context

Serviva una capability che dicesse a un commercialista **cosa fare** per
costituire una S.r.l. italiana interamente controllata da una società USA (socio
unico persona giuridica estera): prima le informazioni/documenti necessari (che
qualcuno deve andare a cercare), poi lo strumento che verifica cosa è già
disponibile, chiede al cliente ciò che manca e redige le bozze già producibili. È
la variante "socio estero" del generico *Costituzione di società* (area 05 del
[problem-space](../knowledge/problem-space.md)), più dura per il layer estero
(apostille, traduzioni giurate, CF per non residenti) e per la fiscalità
cross-border.

Il requisito esplicito dell'utente: **passi ben definiti e grounded in dati
reali**, con una ricerca web mirata per ogni passo. Un'assunzione iniziale
("USA-owned ⇒ niente startup innovativa per la proprietà") si è rivelata
**falsa** già in fase di scoping.

## Decision

Costruita la capability come **tool gated + prompt** (non repo-skill: è
client-facing come `triage_atto`/`raccolta_documenti`, non una procedura di
manutenzione interna come `/verifica-costanti`), grounded con un **fan-out di 6
ricerche mirate** su fonti ufficiali/primarie (Normattiva, Agenzia delle Entrate,
Registro Imprese/MIMIT, Notariato, HCCH, Convenzione Italia-USA), ciascun claim
con `fonte` e flag `verificato`/`da_verificare` — stessa disciplina di provenienza
del registro costanti ([ADR 0011](0011-registro-costanti-fiscali-provenienza.md)).

Pezzi:

- **Dominio puro** in `code/src/lib/fiscal/costituzione-estera.ts`: la
  `CHECKLIST` per fasi (0 decisioni · A documenti USA · B identificativi · C atto
  · D post · E fiscale), la funzione `valutaStartupInnovativa` (gate sulle
  esclusioni pratiche), le tracce di bozza (board resolution, procura). Costanti a
  peso legale (60 mesi, €5M, R&S 15%) registrate in `constants.ts` (ADR 0011).
- **Tool gated** `costituzione_controllata_usa` (`src/lib/mcp/skills/`): stateless
  e puro (ADR 0003) — riceve `documenti_presenti` (derivabili dal client dalla
  cartella dello studio), restituisce roadmap + stato + cosa richiedere + esito
  startup + bozze; lo stato vive in `studio/costituzioni/<societa>.md`
  ([ADR 0010](0010-convenzione-studio-db-client-local.md), prompt
  `convenzione_studio_db` esteso).
- **Prompt** `metodo_costituzione_controllata_usa`: il metodo (quali info
  chiedere, in che ordine, come chiamare il tool, i punti fermi verificati).

Scope v0: **solo S.r.l.** (ordinaria; la S.r.l.s. è esclusa per legge con socio
persona giuridica) e la valutazione **S.r.l. innovativa** dove applicabile. S.p.A.
e conferimenti in natura fuori scope.

### Fatti grounded che correggono le assunzioni

- Requisito "persone fisiche in maggioranza" (ex art. 25 c.2 lett. a D.L.
  179/2012) **abrogato** dal D.L. 76/2013: la proprietà corporate estera **non**
  esclude la startup innovativa. Esclusioni reali: divieto di distribuire utili,
  innovazione, MPMI.
- Deposito al Registro Imprese **10 giorni** (non 20; L. 12/2019).
- Socio unico → capitale versato al **100%** all'atto (art. 2464 c.4).
- **S.r.l.s. non utilizzabile** con socio persona giuridica (art. 2463-bis).
- Documenti USA: **apostille** (Secretary of State) + **traduzione giurata**;
  **EIN non richiesto**; CF italiani di parent (AA5/6 Pescara) e amministratori.
- Dividendi alla parent USA: **5%/15%, mai 0%** (Conv. Italia-USA); madre-figlia
  UE non applicabile.
- **Titolare effettivo**: registro sospeso ma in riattivazione (CGUE 21/5/2026,
  C-684/24 e C-685/24) — flaggato come termine in movimento.

## Consequences

- Nuova capability nel catalogo (S14), gated e metrata (ADR 0002); tool-list e
  test end-to-end aggiornati; unit test sul gate startup e sull'integrità della
  checklist. 128 test verdi.
- Le voci `da_verificare` (prassi notarile, firma digitale non residenti, PEC
  amministratori/sanzione, titolare effettivo in riattivazione, ATECO 2025, IRAP
  regionale) sono esposte nell'output come punti da confermare, non come certezze.
  Sono la coda di lavoro per il **gate G-pilota** (validazione con notaio/
  professionista).
- La disciplina "grounded con fonte + flag, ricerca mirata per passo" diventa il
  pattern per le prossime capability di area 05 (pratiche societarie).
- Doc di riferimento:
  [costituzione-controllata-usa](../knowledge/costituzione-controllata-usa.md).
