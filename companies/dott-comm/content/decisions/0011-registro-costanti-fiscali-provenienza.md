---
title: Registro delle costanti fiscali con provenienza + skill di ri-verifica
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [fiscal-engine, compliance, costanti, manutenzione, tooling]
---

# 0011. Registro delle costanti fiscali con provenienza + skill di ri-verifica

## Context

Il motore fiscale (`code/src/lib/fiscal/`) è costruito su costanti a peso
legale marcate `DA VERIFICARE`. La prima verifica di massa su fonti ufficiali
(2026-07-07) ha trovato 5 divergenze dopo poche settimane di vita del codice —
tra cui il tasso legale già stantio (2% = valore 2025; il 2026 è 1,60%) e
termini perentori raddoppiati da una riforma (bonari 30→60/60→90 gg,
D.Lgs. 108/2024). Tre lezioni strutturali: (1) i valori marciscono in silenzio
e un commento non è un meccanismo; (2) non cambiano solo i valori ma i
*modelli* (scaglioni ravvedimento ora a trigger procedurale, rate AdER a
scaglioni per anno-istanza); (3) la verifica è ricerca agentica ripetibile
(fan-out per area tematica con fonte + data per costante). Il piano
post-cuneo (famiglia di micro-calcolatori per le domande spot) moltiplica
questa superficie ~×10.

## Decision

1. **La source of truth è il registro in codice**: ogni costante a peso legale
   è un dato `{ valore, fonte, verificatoIl }` (`registry.ts` + `constants.ts`);
   i valori che cambiano nel tempo sono tabelle tempo-indicizzate con vigenze,
   consultate per data via `lookupVigente` — un lookup fuori vigenza non
   fallisce silenziosamente: restituisce il valore più plausibile con
   `verificato: false` e una nota che i tool devono esporre nell'output.
2. **La ri-verifica è una skill** (`/verifica-costanti`): fan-out di ricerche
   per area tematica, diff contro il registro, report per sign-off umano,
   applicazione nel registro. Cadenza: dicembre/gennaio + pre-campagna +
   su evento normativo. Schedulabile come agente cloud quando rodata.
3. **Regola del gate**: un tool/calcolatore spedisce solo se le sue costanti
   sono registrate con fonte e `verificatoIl` (simmetrica a `registerGatedTool`
   per il billing). I grandi dataset (tabelle ACI, addizionali comunali) NON
   sono costanti: v0 chiede il dato all'utente, non finge di possederlo.

## Alternatives considered

- **Codice + ledger markdown separato** — due fonti di verità che driftano
  (è la configurazione che ha prodotto il problema); il markdown diventa un
  process doc, non un ledger di valori.
- **Costanti in Supabase** — aggiornabili senza deploy, ma perdono test,
  review e versioning del valore a peso legale; cambiano ~1 volta/anno, il
  deploy non è il collo di bottiglia.
- **Verifica ad hoc quando capita** — il metodo resta nella chat invece che
  nel brain; il tasso legale stantio dimostra che "quando capita" è tardi.

## Consequences

- **Positive:** niente default stantii silenziosi (il failure mode diventa un
  caveat rumoroso); pro-rata automatico su ritardi pluriennali; gli output
  citano fonte e data di verifica per assunzione — fiducia col professionista;
  la superficie ×10 dei calcolatori resta governabile.
- **Trade-offs / negative:** ogni costante costa di più da dichiarare (fonte
  obbligatoria); i consumatori accedono via `.valore`/lookup (leggera
  verbosità); le vigenze storiche vanno mantenute, non sovrascritte.
- **Follow-ups:** applicate le 5 divergenze del 2026-07-07 nella stessa
  migrazione; processo documentato in
  [`manutenzione-costanti-fiscali.md`](../knowledge/manutenzione-costanti-fiscali.md);
  ricontrollo su Normattiva della conversione del D.L. 89/2026 (~21/7) e del
  tasso legale 2024 (mai riverificato); a dicembre 2026 primo giro pieno di
  `/verifica-costanti` (DM tasso legale 2027, legge di bilancio).
