---
title: Advisor valuta_ingresso_italia — sceglie il veicolo e propone l'incarico
status: accepted
date: 2026-07-10
deciders: [pvalfre]
supersedes:
superseded-by:
tags: [mcp, tool, prompt, advisor, ingresso-mercato, usa, veicolo, srl, branch, rappresentante-fiscale, area-04, area-05]
---

# 0015. Advisor `valuta_ingresso_italia` — dal caso reale al veicolo giusto, fino alla proposta di incarico

## Context

Il tool `costituzione_controllata_usa` ([ADR 0014](0014-tool-costituzione-controllata-usa.md))
assume che l'obiettivo sia già deciso (costituire una S.r.l. USA-owned). Mancava
il pezzo **a monte**: una società USA arriva con una situazione e un obiettivo e
chiede *cosa dovrebbe fare*. Railroadare tutti verso una S.r.l. sarebbe una
cattiva consulenza: a seconda del caso il veicolo giusto può essere una semplice
posizione IVA, un ufficio di rappresentanza o un branch.

Richiesta dell'utente: l'advisor deve **valutare il caso reale** (dove vivono i
founder, se la presenza serve solo a fini commerciali, assunzioni, IP,
rimpatrio) e consigliare la **migliore opzione**; poi, poiché l'Agent parla a
nome di uno **studio di commercialisti**, chiudere **proponendo un incarico** come
modo per procedere. La decisione resta sempre del cliente.

## Decision

Costruito un **advisor gated + prompt**, grounded con un **fan-out di 5 ricerche
mirate** su fonti ufficiali/primarie (Normattiva, Agenzia delle Entrate, Registro
Imprese/Camere di Commercio, CNDCEC), stessa disciplina di provenienza del
registro costanti ([ADR 0011](0011-registro-costanti-fiscali-provenienza.md)).

Pezzi:

- **Dominio puro** `code/src/lib/fiscal/ingresso-italia.ts`: i quattro veicoli
  (`VEICOLI`), il gate `livelloStabileOrganizzazione`, la funzione
  `raccomandaVeicolo` (euristica grounded), le FAQ personalizzate, il piano di
  partenza per veicolo e la bozza di proposta di incarico.
- **Tool gated** `valuta_ingresso_italia` (`src/lib/mcp/skills/`): stateless e
  puro (ADR 0003) — riceve la situazione, restituisce riepilogo + raccomandazione
  (motivi, alternative, bandiere) + risposte alle domande chiave + piano di
  partenza + bozza di proposta di incarico; instrada a
  `costituzione_controllata_usa` quando vince la S.r.l. Stato in
  `studio/ingresso/<cliente>.md` (prompt `convenzione_studio_db` esteso).
- **Prompt** `metodo_ingresso_italia`: l'intervista (obiettivo, attività,
  presenza fisica, assunzioni, chi conclude contratti, residenza founder,
  rimpatrio, responsabilità limitata, orizzonte).

### Il perno grounded: la stabile organizzazione

La logica ruota attorno alla **stabile organizzazione** (art. 162 TUIR): finché
non c'è S.O., posizione IVA o ufficio di rappresentanza reggono senza imposte sui
redditi; oltre, si passa a branch o S.r.l. Fatti verificati incorporati:

- Una società USA (extra-UE) **non può fare identificazione diretta** IVA (art.
  35-ter): serve un **rappresentante fiscale** (art. 17 c.3 DPR 633/72),
  responsabile in solido.
- L'**ufficio di rappresentanza** è solo attività ausiliaria (REA, no IVA/redditi);
  se sconfina → S.O. occulta retroattiva.
- Il **branch** è la stessa società USA (nessuno scudo di responsabilità, ma
  nessuna ritenuta sul rimpatrio e perdite verso il parent).
- La **S.r.l.** dà responsabilità limitata; dividendi al parent 5%/15% (mai 0%).
- **Founder residenti in Italia** → rischio esterovestizione (art. 73 c.3/5-bis
  TUIR, riforma D.Lgs. 209/2023) → di norma società italiana con governance
  documentata.

### La chiusura commerciale, entro i vincoli deontologici

L'output termina con una **bozza di proposta di incarico**, ancorata a: obbligo
di **preventivo scritto** (art. 9 D.L. 1/2012, L. 124/2017), **adeguata verifica**
prima del conferimento (art. 18 D.Lgs. 231/2007, tipicamente rafforzata ma
**risk-based**, non automatica — gli USA non sono Paese ad alto rischio), e
**deontologia** (art. 44 Codice Deontologico: veritiera, non ingannevole, non
sollecitata a freddo — qui segue una richiesta reale del cliente). La decisione di
conferire l'incarico resta del cliente.

## Consequences

- Nuova capability nel catalogo (S15), gated e metrata (ADR 0002); tool-list e
  test end-to-end aggiornati; unit test sull'euristica di raccomandazione. 142
  test verdi.
- `valuta_ingresso_italia` è l'ingresso; `costituzione_controllata_usa` è il passo
  successivo quando la risposta è la S.r.l. — catena esplicita.
- Le voci `da_verificare` (soglia S.O. nei casi grigi, branch remittance tax sul
  caso USA, clausola LOB del trattato, IRAP regionale, lista AML) sono esposte
  come punti da confermare col professionista — coda per il gate G-pilota.
- Doc di riferimento:
  [ingresso-mercato-italiano-usa](../knowledge/ingresso-mercato-italiano-usa.md).
