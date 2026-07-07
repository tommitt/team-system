---
title: Il cuneo del 20 luglio — build v0 del server MCP
status: active
owner: ttassi
updated: 2026-07-07
tags: [mcp, track-a, cuneo-20-luglio, fiscal-engine, build, client-local]
---

# Il cuneo del 20 luglio — build v0 del server MCP

_Source of truth su cosa è stato costruito per il cuneo (L1→S7→S12→L2) nel
server MCP `code/`, come è strutturato e come si esegue/testa._

## Overview

Il cuneo del 20 luglio 2026 (D.L. 89/2026) è implementato in v0 e verificato
end-to-end. Il server MCP è un **layer di calcolo deterministico + template**,
senza stato di dominio: i dati fiscali dei clienti restano nei file dello studio,
gestiti dal client (Claude Code). Vedi [ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md).

Capability registrate (tutte via `registerGatedTool`, gate ADR 0002):

| Cod. | Tool MCP | Cosa fa |
|---|---|---|
| S12 | `prospetto_acconti` | One-pager bozza: saldo + 1° acconto 20/7 vs 20/8 +0,80%, split storico (40/60 ord., 50/50 ISA/forf.), previsionale con riga di rischio, piano rate + codici F24 |
| S7 | `estrai_documenti` | Normalizza/valida righe già estratte dal client (date/importi it → ISO/numero, check digit P.IVA, forma CF); coda righe dubbie |
| S9 | `ravvedimento` | Sanzione ridotta + interessi per versamento tardivo (scaglioni per giorni di ritardo) |
| L1 | `raccolta_documenti` | Diff checklist per tipo-cliente vs cosa è arrivato + bozza sollecito specifico |
| L2 | `comunica_versamenti` | Bozza comunicazione al cliente (importi/scadenze/rate) + richiesta conferma |

Più due **MCP prompt** (non gated): `metodo_estrazione_documenti`,
`tono_comunicazione_studio`.

## Details

### Struttura del codice (`companies/dott-comm/code/`)

- `lib/fiscal/` — **rules engine puro** (funzioni pure, testato):
  - `constants.ts` — tutte le costanti a peso legale, centralizzate e con fonte;
    quelle incerte sono marcate **`DA VERIFICARE`** (vedi sotto).
  - `acconti.ts` — `calcolaAcconto` (split 40/60 vs 50/50 per regime),
    `valutaPrevisionale` (riga di rischio: soglia stima×(1−20%), sanzione).
  - `rateazione.ts` — `pianoRate` (≤7 rate, ultima ≤16/12, ~4% annuo).
  - `f24-codici.ts` — codici tributo saldo/acconti + interessi rateazione.
  - `ravvedimento.ts` — `calcolaRavvedimento` (scaglioni + interessi legali).
  - `money.ts` — `round2`, `roundEuro`, `euro` (formato it).
  - `__tests__/` — unit test vitest.
- `lib/parse/it-formats.ts` — `parseImportoIt`, `parseDataIt`,
  `validaPartitaIva` (check digit), `validaCodiceFiscale` (forma). Testato.
- `lib/mcp/` — capability MCP:
  - `register-gated-tool.ts` — wrapper che passa dal gate di billing (ADR 0002).
  - `skills/` (S12, S7, S9), `loops/` (L1, L2), `prompts.ts`.
  - `tools.ts` — **composer sottile** che registra tutto (niente più placeholder).

### Costanti fiscali `DA VERIFICARE`

Le costanti hanno peso legale e sono **default best-effort da validare con un
professionista** prima dell'uso reale (gate G-pilota). I test verificano
l'*aritmetica*, non l'esattezza normativa delle costanti. Punti sensibili in
`lib/fiscal/constants.ts`: split acconto ISA/forfettari 50/50 (art. 12-quinquies
D.L. 34/2019), sanzione omesso versamento 25% post-riforma 2024, tasso legale
annuo (cambia ogni anno, default placeholder 2%), scaglioni ravvedimento, codici
F24. Ogni output porta il `DISCLAIMER_BOZZA`.

### Integrazione col gate di billing

Ogni tool si registra via `registerGatedTool` → `checkAndRecordUsage` (Supabase).
In dev locale con `MCP_REQUIRE_AUTH=false` e `MCP_DEV_USER_ID` vuoto/assente il
gate è **bypassato**: i tool girano ungated e senza Supabase. Con `MCP_DEV_USER_ID`
valorizzato + Supabase reale si esercita il metering (trial 50 call).

### Eseguire e testare

- Unit test: `cd code && npm run test` (23 test).
- Typecheck/lint: `npx tsc --noEmit`, `npm run lint`.
- Server: `npm run dev` → endpoint `http://localhost:3000/api/mcp` (Streamable
  HTTP). `tools/list` mostra le 5 capability + 2 prompt. Nota: il primo POST alla
  route compila on-demand (può richiedere qualche decina di secondi); la richiesta
  GET tiene aperto lo stream SSE (è normale che "penda"). Attenzione a dev server
  duplicati su porte diverse: killa i `next dev` orfani prima di testare.

## Related

- Decisions: [ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md)
  (stateless/client-local), [ADR 0002](../decisions/0002-billing-supabase-stripe-usage-trial.md)
  (gate), [ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md) (server MCP).
- Catalogo: [`catalogo-skills-tools.md`](../brainstorms/catalogo-skills-tools.md)
  (§ Stato build).
- Regole fiscali del cuneo: [`problem-space.md`](./problem-space.md) (cap. Focus).
