---
title: Estrazione scontrini e detrazione spese sanitarie — capability MCP (S13)
status: accepted
date: 2026-07-07
deciders: [pvalfre]
supersedes:
superseded-by:
tags: [mcp, skills, tools, fiscal-engine, spese-sanitarie, detrazione, 730]
---

# 0012. Estrazione scontrini e detrazione spese sanitarie — capability MCP (S13)

## Context

L'attività di raccogliere lo scatolone di scontrini e fatture mediche di un
contribuente, classificarli e trascriverli in un foglio per calcolare la
detrazione IRPEF delle spese sanitarie è tra le più manuali, lente e soggette a
errore della stagione dichiarativa — ed è sul percorso critico del crunch del
20/7: non si sa quanto deve versare un contribuente finché la dichiarazione (e
quindi le spese detraibili) non è sostanzialmente chiusa. La skill S7
`estrai_documenti` normalizza righe già estratte ma non conosce le regole
medico-fiscali (righi E1–E5/E25, franchigia, tracciabilità, dedup precompilato)
né produce il foglio.

Vincolo di prodotto ribadito in questa sessione: le capability si **servono ai
clienti attraverso l'MCP**, non come `.claude/skills/` che governano questo repo
(quella è la categoria di `/verifica-costanti`, interna). Un primo tentativo di
`.claude/skills/estrai-scontrini` è stato scartato per questo.

## Decision

1. **Capability servita via MCP, non repo-skill.** La consegna è:
   - un tool gated `detrazione_sanitaria` (S13) — l'aritmetica deterministica a
     peso legale (`src/lib/mcp/skills/detrazione-sanitaria.ts`), che compone il
     modulo puro `src/lib/fiscal/detrazioni-sanitarie.ts`;
   - un prompt-"skill" `metodo_estrazione_spese_sanitarie` — la **procedura
     end-to-end** che il client (Claude Code) del cliente segue: chiede e
     ricorda dove sono i documenti e dove fare il calcolo, estrae con la vista,
     chiama il tool, scrive il foglio;
   - l'estensione di `convenzione_studio_db` con i file `studio/spese-sanitarie/`.
2. **Il "foglio" è dati emessi dal tool, non file scritti dal server.** Il server
   non ha filesystem né stato di dominio (ADR 0003): il tool emette il riepilogo
   come blocco CSV pronto da salvare in `studio/spese-sanitarie/<cliente>-<anno>.csv`
   e da importare nel foglio Excel/Google Sheet dello studio. Subtotali per rigo
   e detrazione stimata li calcola il tool (unica fonte dei numeri).
3. **Regole fiscali verificate sulle istruzioni ufficiali del Modello 730/2026
   (periodo d'imposta 2025).** Costanti registrate con provenienza (ADR 0011):
   franchigia **unica €129,11 sul pool E1(col.1+col.2)+E2** (non separata per
   rigo); E3 (mezzi/ausili/sussidi disabili) 19% pieno senza franchigia; E4
   (veicoli disabili) 19% su `min(spesa, €18.075,99)`; E5 (cane guida) 19% pieno;
   **E25** (spese mediche generiche/assistenza specifica disabili) è un **onere
   DEDUCIBILE**, riportato a parte e mai trattato al 19%; rimborsi scorporati;
   tracciabilità obbligatoria con le 3 eccezioni (farmaci, dispositivi, strutture
   accreditate SSN); rateizzazione se E1+E2+E3 > €15.493,71.
4. **Schema del foglio configurabile.** Le colonne del CSV sono un parametro
   `colonne` (sottoinsieme/ordine qualsiasi delle colonne disponibili),
   ricordato nel `config.md` dello studio: la flessibilità dello schema è un
   requisito, non un set di campi fisso.

## Alternatives considered

- **`.claude/skills/estrai-scontrini` con renderer Python** — scartata: governa
  questo repo, non è servita ai clienti. Era un fraintendimento del deliverable.
- **Matematica inline nel prompt** — scartata: non testabile e fuori dalla regola
  del gate delle costanti (ADR 0011); i numeri a peso legale devono stare nel
  motore.
- **Scrivere l'.xlsx lato server** — impossibile (nessun filesystem/stato, ADR
  0003); il blocco CSV è la consegna MCP-native del foglio.
- **Trattare E2 con franchigia separata / instradare le spese mediche dei
  disabili in E3** — scartata perché **fiscalmente errata** (verifica sulle
  istruzioni 730/2026): la franchigia è unica sul pool E1+E2, e le spese mediche
  generiche dei disabili sono E25 (deduzione).

## Consequences

- **Positive:** calcolo verificato su fonte primaria (istruzioni 730/2026);
  schema flessibile e ricordato; client-local (zero PII sui nostri server);
  human-in-the-loop (ogni output è una bozza col disclaimer); alimenta la catena
  del 20/7 (la detrazione entra nel calcolo del saldo). 116 test verdi.
- **Trade-offs / negative:** la stima E2 è un massimo teorico (richiede
  l'incapienza del familiare malato, dato esterno) — segnalato in output; lo
  stato pluriennale delle rate E4/E5 e il riporto E6 non sono modellati in v0;
  E25 è solo *segnalato* come deduzione, non calcolato nel reddito imponibile.
- **Follow-ups:** validazione col pilota (gate G-pilota); valutare lo stato
  multi-anno (E4/E5 rate, E6) e il calcolo della deduzione E25; scrittura diretta
  su Google Sheet via connettore quando disponibile.
