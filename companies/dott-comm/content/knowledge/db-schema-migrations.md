---
title: Database schema & migrations — declarative schemas + Supabase CLI
status: active
owner: ttassi
updated: 2026-07-07
tags: [supabase, migrations, schema, postgres, devex, engineering, runbook]
---

# Database schema & migrations

How we define and evolve the Supabase Postgres schema for the Dott. Comm. app.
Decision context: [ADR 0007](../decisions/0007-declarative-schema-cli-migrations.md)
(supersedes the old "paste the SQL into the Supabase SQL Editor" flow). The
schema holds **billing + product signal only** — never fiscal data
([ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md),
[ADR 0006](../decisions/0006-telemetry-feedback-supabase.md)).

## The model: two directories

```
code/supabase/
├── schemas/       ← SOURCE OF TRUTH. Desired end-state, hand-edited.
│   ├── 01_billing.sql     users_billing + increment_usage() RPC + RLS
│   └── 02_telemetry.sql   tool_events + feedback + RLS
├── migrations/    ← DERIVED history. `db diff` appends timestamped files here.
│   ├── 00001_users_billing.sql      ┐ legacy, applied by hand — kept as-is,
│   ├── 00002_daily_usage.sql        │ they are the baseline the tracking
│   └── 00003_telemetry_feedback.sql ┘ table must match. Never edit/rename.
└── config.toml    schema_paths = ["./schemas/*.sql"]
```

Think **SQLAlchemy models + Alembic**, but the "models" are `.sql`: you edit the
declarative `schemas/` files, tooling *derives* the migration. This keeps a
single readable definition of everything (e.g. `increment_usage` lives in one
place instead of being created in `00001` and redefined in `00002`), and keeps
plpgsql functions + RLS as native SQL (which an ORM expresses poorly).

## Prerequisites

- **Supabase CLI** — installed as a devDependency; invoke via `npx supabase`.
- **Docker Desktop, running** — required for `db diff` (it spins up a throwaway
  shadow Postgres to compute the diff) and any local DB. `db push` does **not**
  need Docker, only network + a linked project.
- **`supabase login`** once (stores an access token in `~/.supabase`) — needed
  for `link` and `db:types --linked`.

## The everyday loop

```
1. edit code/supabase/schemas/*.sql        (describe the schema you WANT)
2. npm run db:diff -- -f add_something      (generates a migration from the diff)
3. review the new file in supabase/migrations/
4. npm run db:push                          (applies pending migrations to the linked DB)
5. npm run db:types                         (regenerate lib/billing/database.types.ts)
```

Scripts (`code/package.json`):

| script | does |
|---|---|
| `npm run db:diff -- -f <name>` | diff `schemas/` vs migration history → write a new migration |
| `npm run db:push` | apply pending migrations to the linked project |
| `npm run db:new <name>` | scaffold an empty hand-written migration (data migrations, things diff can't express) |
| `npm run db:lint` | static schema check |
| `npm run db:types` | regenerate `src/lib/billing/database.types.ts` from the linked schema |

Targeting **dev vs prod**: link the project you're pushing to first
(`npx supabase link --project-ref <ref>`), or pass `--db-url <connection-string>`
to `db push`. Push to dev, verify, then prod.

## One-time setup per database (baseline)

Prod and dev already had `00001–00003` applied **by hand**, so their
`supabase_migrations.schema_migrations` tracking table is empty. Before the first
`db push`, mark those three as already applied or push will try to re-create
existing objects and fail. Once per environment:

```
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list                       # shows 3 local, 0 remote
npx supabase migration repair --status applied 00001 00002 00003
npx supabase migration list                       # all three now applied both sides
npm run db:types                                   # canonicalize the generated types
```

(Verify the exact `repair` version-arg syntax against the installed CLI version
before running against prod.)

## Verify the schema matches reality

The key correctness check: with `schemas/` authored and the DB baselined,

```
npm run db:diff -- -f _check
```

should produce an **empty** migration — proving `schemas/` reproduces exactly the
currently-applied schema. If it's non-empty, the schema files drifted from the
three migrations; fix `schemas/` until the diff is empty, then delete the throwaway
file.

## Notes & gotchas

- **Don't hand-edit or rename `00001–00003`.** They're the applied history the
  baseline matches; renaming to timestamps would break `migration repair`.
- **`db diff` uses [migra] under the hood** — review every generated migration.
  It doesn't capture everything perfectly (e.g. some `comment on`, certain
  ownership/grants); add anything missing with `npm run db:new`.
- **Changing a function's return type needs a `drop` first.** `CREATE OR REPLACE
  FUNCTION` cannot change the return type / OUT-params (Postgres error 42P13) —
  precede it with `drop function if exists <name>(<argtypes>);` in the migration
  (see `00002_daily_usage.sql`, which reshapes `increment_usage`). The
  declarative `schemas/` file doesn't need the drop — it only creates the final
  version once, against a fresh shadow DB.
- **`database.types.ts` is generated.** It's hand-seeded today to match generator
  output; the first real `npm run db:types` (after linking) canonicalizes it. The
  service-role client in `src/lib/billing/supabase.ts` is typed `SupabaseClient<Database>`.
- **CI is deferred** (ADR 0007): applying migrations is a manual `npm run db:push`
  gate for now. Auto-apply on merge is a future follow-up.

[migra]: https://databaseci.com/docs/migra
