---
title: Track A senza stato di dominio server-side — rules engine puro, stato client-local, studio-db come convenzione
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [mcp, track-a, architettura, gdpr, studio-db, client-local, cuneo-20-luglio]
---

# 0003. Track A senza stato di dominio server-side — rules engine puro, stato client-local, studio-db come convenzione

## Context

Implementando il cuneo del 20 luglio 2026 (la catena L1→S7→S12→L2 del
[catalogo](../brainstorms/catalogo-skills-tools.md)) si è posta la domanda su
dove vivano i dati: il catalogo prevedeva `studio-db` (T1) come **keystone
data model server-side**. Ma i dati di dominio dello studio sono **PII fiscale
pesante** (scadenzario, documenti, importi, conferme dei clienti), e il client
v0 è **Claude Code**, che gira nello studio con accesso al filesystem. Inoltre
il billing ([ADR 0002](0002-billing-supabase-stripe-usage-trial.md)) ha già reso
Supabase una dipendenza runtime, ma solo per metering/entitlement.

## Decision

1. **Nessuno stato di dominio server-side per Track A.** Il server MCP è un
   **layer di calcolo deterministico + template**, senza memoria dei dati
   fiscali. Riceve numeri, restituisce bozze, non persiste nulla di dominio.
2. **Stato di dominio client-local.** Roster clienti, stato raccolta documenti,
   log inviato/confermato vivono in **file dello studio**, letti/scritti da
   Claude Code. Noi non tocchiamo mai la PII dei clienti → superficie GDPR ≈ zero.
3. **`studio-db` (T1) si riformula da DB a convenzione client-local**: un
   formato/cartella di file che il client mantiene, non una tabella nostra.
4. **Supabase resta esclusivamente billing/entitlement** (ADR 0002): misura
   *quante* chiamate, non *cosa* contengono. I due domini di dato restano separati.
5. **Rules engine puro e testato.** Le regole fiscali con peso legale stanno in
   `code/lib/fiscal/`, con costanti centralizzate e marcate `DA VERIFICARE`;
   ogni output è etichettato *bozza* (human-in-the-loop). Le skill si registrano
   tutte via `registerGatedTool` (gate ADR 0002).
6. **Statefulness server-side solo dietro trigger concreto**, ciascuno con una
   sua ADR: (1) watchdog always-on (W1 PEC, W5 norme); (2) client hosted senza
   filesystem; (3) multi-utente live nello stesso studio. Finché siamo su
   Claude Code + cuneo, nessuno scatta.

## Alternatives considered

- **T1 come DB server-side (Supabase) per lo scadenzario e l'audit trail** — la
  proposta originale del catalogo. Scartata per il cuneo: aggiunge PII fiscale
  sui nostri server (peso GDPR), infra e attrito non richiesti dalla deadline,
  senza vantaggi per un client che ha già il filesystem. Resta l'opzione dietro
  i trigger sopra.
- **File JSON locale per pilota singolo gestito dal server** — comunque implica
  che il server tenga stato/PII; superato dal client-local puro.

## Consequences

- **Positive:** GDPR ≈ zero sui dati dei clienti; server semplice e stateless;
  coerenza col posizionamento *assist-the-professional*; il cuneo spedibile senza
  dipendere da Supabase (gate bypassabile in dev); le stesse skill fanno da
  motore di campagna guidato dal roster client-local (si ri-innescano al 30/11 e
  a ogni 16 del mese).
- **Trade-offs / negative:** nessuna visibilità/telemetria server-side sullo
  stato di dominio; niente sync multi-dispositivo nativo (mitigabile con drive/
  repo condiviso dello studio); i watchdog always-on richiederanno comunque una
  soluzione stateful dedicata (trigger 1).
- **Follow-ups:**
  - Aggiornato il [catalogo](../brainstorms/catalogo-skills-tools.md): T1
    riformulato come convenzione client-local.
  - Definire la convenzione file di `studio/` (roster, scadenzario, raccolta,
    comunicazioni.log) quando arriva il primo pilota (G-pilota).
  - Le costanti fiscali `DA VERIFICARE` in `lib/fiscal/constants.ts` vanno
    validate da un professionista prima dell'uso reale.
