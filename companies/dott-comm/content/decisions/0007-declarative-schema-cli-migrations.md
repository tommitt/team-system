---
title: Schema dichiarativo + migrazioni via Supabase CLI (fine del SQL editor a mano)
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [supabase, migrazioni, schema, devex, engineering, postgres]
---

# 0007. Schema dichiarativo + migrazioni via Supabase CLI (fine del SQL editor a mano)

## Context

Lo schema del DB esisteva **solo** come somma di tre file SQL numerati a mano
(`supabase/migrations/00001…00003`), e l'unico modo per applicarli era incollarli
uno per uno nel SQL Editor di Supabase (vedi i passi "SQL Editor → paste and run"
in [dev-setup-guide.md](../knowledge/dev-setup-guide.md) §3 e
[billing-setup.md](../knowledge/billing-setup.md)). Due problemi:

1. **DevEx.** Applicazione manuale, soggetta a errori, senza traccia di cosa sia
   applicato dove: facile sbagliare ordine o dimenticare una migrazione su dev vs
   prod.
2. **Nessuna fonte di verità per lo schema.** Per sapere la definizione *corrente*
   di `increment_usage` bisogna rieseguire mentalmente tutti e tre i file — è
   creata in `00001` (ritorna `usage_count, plan`) e **ridefinita** in `00002`
   (aggiunge `daily_usage_count`). Non esiste un posto solo che mostri lo schema
   com'è.

Il modello di riferimento è SQLAlchemy models + Alembic: un file dichiarativo è
la fonte di verità e le migrazioni sono *derivate*. Vincolo:
[ADR 0003](0003-track-a-stateless-client-local-state.md) e
[ADR 0006](0006-telemetry-feedback-supabase.md) fissano Supabase a
"billing + segnale di prodotto", zero dati fiscali — lo schema resta piccolo per
scelta (4 tabelle + una RPC plpgsql + RLS).

## Decision

1. **Schema dichiarativo come fonte di verità.** Adottiamo gli *declarative
   schemas* della Supabase CLI: `supabase/schemas/*.sql` descrive lo stato finale
   desiderato (`01_billing.sql`, `02_telemetry.sql`), configurato in
   `supabase/config.toml` (`[db.migrations] schema_paths`). È l'equivalente nativo
   dei model Alembic, ma in SQL.
2. **Migrazioni derivate, non scritte a mano.** Il ciclo diventa: modifica
   `schemas/` → `npm run db:diff -- -f <nome>` (genera la migrazione dal diff
   contro lo shadow DB) → review → `npm run db:push` (applica al progetto
   collegato). Script `db:diff` / `db:push` / `db:new` / `db:lint` / `db:types` in
   `package.json`; CLI come devDependency (`npx supabase`).
3. **I tre file `00001–00003` restano come storia applicata**, immutati. Le nuove
   migrazioni (timestamp) si aggiungono accanto. I DB esistenti (dev + prod), già
   applicati a mano, vanno **baselinati una tantum** (`supabase migration repair
   --status applied …`) perché la loro tabella di tracking è vuota.
4. **Gate di applicazione manuale, niente CI per ora.** `db push` lo lancia una
   persona dopo review, prima su dev poi su prod. La CI (auto-apply su merge in
   main) è un follow-up documentato, non fatta oggi.
5. **Tipi generati.** `npm run db:types` genera `lib/billing/database.types.ts`; il
   client in `lib/billing/supabase.ts` è tipizzato `SupabaseClient<Database>` — la
   metà "type-safety" del vantaggio ORM, senza adottare un ORM.

## Alternatives considered

- **ORM TypeScript (Drizzle / Prisma).** Model-as-code con generazione migrazioni,
  il vero analogo di Alembic. Scartato: aggiunge una dipendenza runtime e (Drizzle)
  richiede una connection string Postgres diretta che oggi non abbiamo (abbiamo la
  service-role key, cioè PostgREST); funzioni plpgsql e RLS restano SQL scritto a
  mano che l'ORM si limita a trasportare; per uno store di 4 tabelle vincolato
  dall'ADR 0003 a non crescere, non si giustifica. Prisma inoltre è scomodo su
  serverless Vercel + pooling Supabase.
- **Runner di migrazioni fatto in casa** (`npm run migrate` che legge i `.sql` e
  tiene una tabella di applicate). Scartato: reinventa la CLI e non può usare la
  service-role key (è PostgREST, non DDL) — servirebbe comunque una connection
  string.
- **Restare sul SQL editor.** È il problema di partenza.

## Consequences

- **Positive:** una fonte di verità leggibile per lo schema (`increment_usage` in
  una sola definizione); migrazioni generate e tracciate, applicabili con un
  comando in modo idempotente e ordinato su dev e prod; query tipizzate contro lo
  schema.
- **Trade-offs / negative:** **Docker Desktop** diventa una dipendenza locale (lo
  richiede `db diff` per lo shadow DB; `db push` no); il **baseline** dei DB
  esistenti è un passo delicato da fare una volta; `database.types.ts` è
  seed-ato a mano finché non gira il primo `db:types` su progetto collegato.
- **Follow-ups:**
  - Collegare i progetti (`supabase link`) e baselinare dev + prod
    (`migration repair`) prima del primo `db push` — vedi
    [db-schema-migrations.md](../knowledge/db-schema-migrations.md).
  - Rigenerare `database.types.ts` con `npm run db:types` al primo link.
  - **CI:** valutare una GitHub Action che fa `db push` su merge in main
    (auto-apply su prod) quando il flusso manuale sarà rodato.
