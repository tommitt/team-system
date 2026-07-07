---
title: Telemetria per-chiamata + feedback esplicito in Supabase — segnale di prodotto senza dati fiscali
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [mcp, telemetria, feedback, supabase, gdpr, prioritizzazione]
---

# 0006. Telemetria per-chiamata + feedback esplicito in Supabase — segnale di prodotto senza dati fiscali

## Context

Un utente del MCP non ha alcun modo di darci feedback, e noi non abbiamo alcuna
visibilità sulle sessioni: la conversazione avviene dentro Claude
(Desktop/Code), e l'unico segnale che raggiunge il nostro server sono le
chiamate ai tool — finora solo *contate* dal gate di billing
([ADR 0002](0002-billing-supabase-stripe-usage-trial.md)), non osservate.
Quando un commercialista chiede qualcosa che i tool non sanno fare, il segnale
di prodotto più prezioso che esista evapora senza mai toccare il server.
Questo segnale deve alimentare la pipeline autonoma di prioritizzazione della
software factory (cron mattutino — futuro, fuori scope qui).

Vincolo: [ADR 0003](0003-track-a-stateless-client-local-state.md) stabilisce
che il server non persiste dati di dominio fiscale e che Supabase è
esclusivamente billing/entitlement.

## Decision

1. **Layer 1 — telemetria passiva.** Ogni chiamata gated registra un evento in
   una nuova tabella Supabase `tool_events`: tool, utente, esito
   (`ok`/`error`/`blocked`), latenza, **soli nomi** degli argomenti
   (`args_keys`), mai i valori. Registrata al chokepoint esistente
   `registerGatedTool` → nessun lavoro per i tool futuri.
2. **Layer 2 — feedback esplicito.** Nuovo tool MCP `invia_feedback`
   (categoria/messaggio/contesto → tabella `feedback`) + `instructions` a
   livello server: il modello, presente in ogni sessione, è il nostro
   raccoglitore di feedback — propone la segnalazione quando rileva un bisogno
   non soddisfatto, e la invia col consenso dell'utente. È l'unico canale di
   ascolto praticabile per un prodotto MCP.
3. **`invia_feedback` è l'unica eccezione al gate**: registrato ungated perché
   non è una capability fatturabile e deve funzionare anche oltre il paywall
   (le ragioni di churn sono il feedback più prezioso).
4. **Supabase si estende da "billing-only" a "billing + segnale di prodotto",
   ma la linea dell'ADR 0003 regge**: zero dati di dominio fiscale. La
   telemetria è metadata (nomi, esiti, tempi); il feedback è testo redatto
   dall'utente, e il modello è istruito (descrizione tool + instructions) a
   non includervi dati dei clienti dello studio.
5. **Polarità dei fallimenti**: la telemetria **fallisce aperta** (mai bloccare
   o degradare un tool per un errore di observability), il gate di billing
   resta **fail closed**.

## Alternatives considered

- **Nessuna raccolta / interviste manuali ai piloti.** Le conversazioni dirette
  restano più ricche a N piccolo, ma ogni sessione non strumentata è segnale
  perso per sempre; i due canali si sommano, non si escludono.
- **Analytics di terze parti (PostHog/Mixpanel).** Overkill per eventi
  server-side a basso volume; aggiunge un processor di dati e un SDK per ciò
  che è una insert su un DB che già abbiamo.
- **Registrare anche i valori degli argomenti per debugging.** Scartato:
  violerebbe l'ADR 0003 e porterebbe PII fiscale sui nostri server.

## Consequences

- **Positive:** ogni chiamata produce segnale (workflow reali, errori, blocchi
  paywall); il bisogno inespresso diventa una riga strutturata in `feedback`;
  base dati pronta per il cron di prioritizzazione (layer 3).
- **Trade-offs / negative:** ~una insert in più per chiamata (~30ms, await
  consapevole: fire-and-forget non è affidabile su serverless); i fallimenti
  di validazione Zod avvengono nell'SDK **prima** del wrapper e non sono
  catturati in v1; `tool_events` cresce senza retention policy (rivederla al
  crescere del volume).
- **Follow-ups:**
  - Applicare `supabase/migrations/00003_telemetry_feedback.sql` (SQL Editor)
    su dev e prod (dopo la 00002 del trial giornaliero, sviluppata in parallelo).
  - Informativa privacy aggiornata (`code/legal/privacy-policy.md`) — **da far
    rivedere** prima del deploy.
  - Layer 3: cron mattutino che legge `tool_events` + `feedback`, clusterizza
    e propone priorità (scoring per frizione esterna, non per conteggio voti).
  - Valutare la cattura dei fallimenti di validazione Zod.
