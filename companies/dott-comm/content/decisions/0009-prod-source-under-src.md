---
title: Codice di produzione sotto `src/` (separato da config e tooling)
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [engineering, devex, nextjs, struttura, repo]
---

# 0009. Codice di produzione sotto `src/` (separato da config e tooling)

## Context

Con la crescita delle LOC, la root di `companies/dott-comm/code/` ha iniziato a
mescolare in un unico livello tre cose diverse: il **codice sorgente** (`app/`,
`components/`, `lib/`, `proxy.ts`), la **configurazione** (`next.config.ts`,
`tsconfig.json`, `package.json`, `eslint.config.mjs`, `vitest.config.ts`,
`.env*`), il **tooling e gli asset** (`supabase/`, `scripts/`, `public/`,
`legal/`, `test/`) e i **generati** (`.next/`, `.vercel/`, `node_modules/`).
~28 voci in cui le tre cartelle di sorgente sono annegate nel rumore.

Next.js (16.x) supporta di prima classe una directory `src/`: rileva
automaticamente `src/app` e `src/proxy.ts`. L'alias `@/*` di `tsconfig.json`
puntava a `./*` e tutti gli import passano da `@/lib/…`, `@/components/…`: questo
rende lo spostamento quasi gratuito lato codice, perché è l'alias — non i singoli
import — a dover cambiare.

## Decision

1. **Il codice di produzione vive sotto `src/`.** Spostiamo dentro `src/` solo
   `app/`, `components/`, `lib/` e `proxy.ts` (il middleware di Next 16, che deve
   stare allo stesso livello di `app/`). `git mv` preserva la history.
2. **L'alias `@/*` mappa a `./src/*`.** Un'unica riga in `tsconfig.json`; gli
   import restano `@/lib/…` invariati. Specchiato anche in `vitest.config.ts`
   (alias `@` → `./src`) e nello script `db:types` di `package.json`, che scrive
   in `src/lib/billing/database.types.ts`.
3. **Config, tooling e asset restano alla root di `code/`.** `next.config.ts`,
   `tsconfig.json`, `package.json`, `eslint.config.mjs`, `vitest.config.ts`,
   `.env*`, più `public/`, `supabase/`, `scripts/`, `test/`, `legal/` e i
   generati: il framework, Vercel e la toolchain li richiedono lì.
4. **Gli ADR precedenti non si riscrivono.** I path `lib/…` / `app/…` citati in
   ADR 0001/0003/0005/0007 restano com'erano: un ADR descrive lo stato al momento
   della decisione (regola di gruppo: si supersede, non si riscrive la storia).
   La verità corrente la portano i doc vivi (`code/AGENTS.md`, i knowledge doc,
   `CLAUDE.md`), aggiornati a `src/…`.

## Alternatives considered

- **Lasciare tutto in root.** È il problema di partenza: il sorgente resta
  visivamente confuso con config e generati man mano che cresce.
- **Spostare in `src/` anche `test/`, `scripts/`, `legal/`.** Scartato: `test/`
  ha già la sua radice e lo stub `server-only`; `scripts/` e `legal/` non sono
  codice applicativo. Tenerli fuori mantiene `src/` = *solo ciò che va in
  produzione*.
- **Riorganizzazione più aggressiva** (es. feature-folders, monorepo). Fuori
  scope: qui l'obiettivo è solo separare sorgente da rumore con la convenzione
  nativa di Next, a costo quasi nullo.

## Consequences

- **Positive:** il sorgente di produzione è recintato in `src/` (4 voci
  autoesplicative) e distinto da config/tooling/generati; convenzione idiomatica
  Next.js; migrazione a costo ~nullo grazie all'alias — nessun import toccato.
  Verificato: `npm run build` (incluso il rilevamento di `src/proxy.ts` come
  Middleware) e `npm run test` (52/52) passano dopo lo spostamento.
- **Trade-offs / negative:** i path assoluti citati nei doc vanno tenuti
  allineati (fatto in questo giro per i doc vivi); gli ADR storici ora citano
  path non più esistenti — accettato come costo della regola "non riscrivere la
  storia".
- **Follow-ups:** nessuno. Le nuove capability MCP nascono già sotto
  `src/lib/mcp/` (vedi `code/AGENTS.md`).
