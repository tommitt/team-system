---
title: "Listino pubblico e packaging: Free / Premium €98 / Su misura"
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [billing, pricing, packaging, stripe, go-to-market, product]
---

# 0008. Listino pubblico e packaging: Free / Premium €98 / Su misura

## Context

[ADR 0002](0002-billing-supabase-stripe-usage-trial.md) ha fissato il
**meccanismo** di billing (WorkOS + Stripe + Supabase, trial gated dal numero di
tool call, piano pagato = "una singola subscription mensile flat, utilizzo
illimitato") ma ha lasciato aperto — esplicitamente, come follow-up "add paid
usage caps/tiers if pricing evolves" — **quanto** si paga e **come è confezionata**
l'offerta. Il redesign della landing page (journal 2026-07-07) ha reso questa la
domanda bloccante: il sito ha una sezione Prezzi e serviva un listino reale, non
illustrativo. Questa ADR fissa il packaging pubblico e lo mappa sul meccanismo
già deciso.

## Decision

1. **Tre livelli pubblici**, esattamente come mostrati sulla landing:

   | Livello | Prezzo | Per chi | Stato billing (ADR 0002) |
   |---|---|---|---|
   | **Free** | €0/mese, senza carta | Provare su un caso reale | `trial` (50 call upfront, poi 20/giorno, reset a mezzanotte Europe/Rome) |
   | **Premium** | **€98/mese** | Il professionista singolo | `active` — la subscription flat mensile, `STRIPE_PRICE_ID` |
   | **Su misura** | preventivo dedicato | Studi con più postazioni / uso centralizzato | nessun self-serve: canale commerciale |

2. **Free *è* il trial, non un secondo meccanismo.** Il tier gratuito permanente
   coincide con il gate di ADR 0002: tutti gli strumenti, 1 utente, utilizzo
   limitato (il cap giornaliero *è* il limite del piano Free), supporto via email.
   Non esiste codice "free-forever vs trial" separato.

3. **Premium = lo stato `active`.** €98/mese, 1 utente, utilizzo illimitato, tutti
   gli strumenti, scadenzario sempre aggiornato e supporto prioritario. È il
   singolo `STRIPE_PRICE_ID` già previsto da ADR 0002 — nessun nuovo prezzo Stripe,
   nessun per-seat self-serve (Premium è mono-utente per definizione).

4. **Su misura è vendita, non checkout.** Più postazioni, uso centralizzato dello
   studio, SSO e sicurezza avanzata, referente dedicato e formazione team. Non ha
   (ancora) un percorso self-serve: la CTA è un contatto (`mailto:info@dottcomm.dev`).
   Nessun codice di billing multi-postazione oggi.

5. **Ancoraggio del prezzo: "rientra alla prima pratica".** €98/mese è scelto per
   essere ripagato dalla prima singola pratica ripetitiva risparmiata nel mese —
   la promessa esplicita della sezione Prezzi e della closing CTA. Un unico punto
   di prezzo, niente scaletta di tier a pagamento self-serve: la complessità
   multi-utente va sul canale Su misura.

## Alternatives considered

- **Prezzo a consumo (metered) sul pagato.** ADR 0002 già *conta* le call, quindi
  tecnicamente possibile. Scartato: per un commercialista il valore è mensile e
  ricorrente, e una bolletta prevedibile è più vendibile di un contatore; il gate
  a consumo resta il meccanismo del *Free*, non del pagato.
- **Più tier a pagamento self-serve (es. Studio a X postazioni).** Rimandato: la
  domanda multi-postazione passa oggi per Su misura (vendita), così non si
  costruisce il billing per-seat prima di avere un cliente che lo chiede
  (coerente con la regola "sequenziare per attrito esterno" del CLAUDE.md).
- **Prezzo più basso/più alto.** €98 scelto sull'ancoraggio "prima pratica";
  da rivedere con dati di conversione reali.

## Consequences

- **Positive:** il listino pubblico è ora una verità documentata, allineata a
  landing + Stripe + [billing-setup.md](../knowledge/billing-setup.md); Premium
  riusa il singolo `STRIPE_PRICE_ID` esistente, zero nuovo codice di billing.
- **Trade-offs / negative:** **tre posti da tenere in sync** — la sezione Prezzi
  della landing (`code/app/page.tsx`), questo listino, e il Price su Stripe; se
  cambia il prezzo vanno aggiornati tutti e tre. Su misura è manuale (nessun
  self-serve) finché non arriva domanda. La copy del Free sulla landing
  ("utilizzo mensile limitato") è una semplificazione commerciale del cap
  *giornaliero* reale (20/giorno) — accettabile, ma è il punto in cui listino e
  meccanismo divergono a parole.
- **Follow-ups:**
  - Costruire il percorso Su misura / multi-postazione (e l'eventuale billing
    per-seat) quando un cliente lo richiede.
  - Rivedere €98 e la soglia del Free con dati di conversione (eredita il
    follow-up di ADR 0002 sulle soglie).
  - Se il prezzo cambia: aggiornare landing + questo ADR (nuova ADR che supersede)
    + `STRIPE_PRICE_ID`.
