---
title: Link paywall con token firmato → checkout senza re-login
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [billing, paywall, stripe, checkout, auth, ux, sicurezza]
---

# 0005. Link paywall con token firmato → checkout senza re-login

## Context

Quando la prova gratuita finisce (o l'abbonamento non è attivo), il gate di
billing ([ADR 0002](0002-billing-supabase-stripe-usage-trial.md)) risponde
in-band con un messaggio che contiene il link `/upgrade`. Fino a ora quel link
era **globale e uguale per tutti**: l'utente arrivava sul sito **senza sessione**
e doveva **ri-autenticarsi** (login AuthKit nel browser) prima di poter avviare
il checkout Stripe — pur essendo già stato identificato dal server MCP, che ne
ha verificato il JWT e conosce il `workos_user_id`.

Quel passo di re-login è attrito inutile proprio nel punto di conversione più
importante (paywall → pagamento), e obbliga l'utente a rifare un flusso di auth
nel browser che ha già fatto per collegare il connettore.

## Decision

Il messaggio di paywall include un **token firmato di breve durata** nel link:
`/upgrade?t=<token>`. Il server MCP, che già conosce l'utente, firma
`{ sub, exp }` (HMAC-SHA256, TTL 15 min) e lo mette nell'URL. La pagina
`/upgrade` verifica il token e manda l'utente **direttamente a Stripe Checkout,
senza login AuthKit**.

- `lib/billing/upgrade-token.ts` — `signUpgradeToken` / `verifyUpgradeToken`,
  confronto firma a tempo costante, segreto `UPGRADE_TOKEN_SECRET` (fallback
  `WORKOS_COOKIE_PASSWORD`).
- `lib/billing/gate.ts` — `upgradeUrl(userId)` appende `?t=…`; `decide()` e
  `checkAndRecordUsage` propagano lo `userId` verificato.
- `app/upgrade/actions.ts` — `startCheckout` accetta il token dal form, lo
  verifica e crea la sessione di checkout legata a quel `workos_user_id`
  (`client_reference_id` + metadata, come prima); il webhook Stripe attiva il
  piano al successivo tool-call senza refresh del token MCP.
- `app/upgrade/page.tsx` — un token valido mostra la CTA di checkout senza il
  gate di login.

**Ambito del token: solo checkout.** Il **portale clienti Stripe** (disdetta,
rimborsi, fatture, cambio carta) resta dietro login AuthKit completo. Un utente
con solo-token su un piano già attivo vede "Accedi per gestire", non il portale.

Se il segreto non è configurato (dev/test) il link **degrada** al vecchio
`/upgrade` + flusso di sign-in: nessuna regressione.

## Alternatives considered

- **Lasciare il re-login** — scartato: attrito nel punto di conversione, e
  ridondante visto che l'identità è già nota lato MCP.
- **Token che apre anche il portale** — scartato: superficie sensibile
  (disdetta/rimborsi/fatture). Il raggio d'azione di un token trapelato deve
  restare minimo.
- **Sessione/magic-link server-side invece di un token nell'URL** — più
  infrastruttura (store, invalidazione) per un guadagno nullo: il token firmato
  a TTL corto è sufficiente e stateless.

## Consequences

- **Positive:** dal paywall al pagamento in un clic, nessun re-login; nessuno
  stato server aggiuntivo (token stateless, coerente con [ADR 0003](0003-track-a-stateless-client-local-state.md));
  fallback pulito senza segreto.
- **Trade-offs / negative:** raggio d'azione di un token trapelato = "un
  estraneo può pagare l'abbonamento di quell'utente con la propria carta"
  (accettabile); serve gestire `UPGRADE_TOKEN_SECRET` come segreto; il portale
  richiede comunque il login (per scelta).
- **Follow-ups:** valutare rotazione/scadenza del segreto; eventuale
  invalidazione esplicita dei token non prevista (TTL 15 min ritenuto
  sufficiente).
