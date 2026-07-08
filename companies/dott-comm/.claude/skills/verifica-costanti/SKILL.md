---
name: verifica-costanti
description: Re-verify Dott. Comm.'s fiscal-constants registry against official sources and report divergences for human sign-off. Run in December/January (annual rollover of tasso legale, legge di bilancio, festività), before each fiscal campaign (20/7-type deadlines, 30/11), or when a norm change is suspected. Triggers include "verifica le costanti", "check fiscal constants", "le costanti sono aggiornate?".
---

# Verifica delle costanti fiscali — il giro di manutenzione del registro

Il registro (`companies/dott-comm/code/src/lib/fiscal/constants.ts`, più
`f24-codici.ts` e le festività in `calendario.ts`) è la source of truth: ogni
costante a peso legale porta `{ valore, fonte, verificatoIl }` (ADR 0011).
Questa skill ri-verifica quei valori contro le fonti ufficiali e produce un
report di divergenze. **Non applicare mai correzioni al codice senza il
sign-off dell'utente sul report.**

## Procedura

1. **Leggi il registro.** Estrai da `constants.ts` (e `f24-codici.ts`,
   `FESTIVITA_FISSE` in `calendario.ts`) l'elenco completo: nome, valore,
   fonte, `verificatoIl`, vigenze. Nota le voci con `verificatoIl: null` —
   sono le prime da verificare.

2. **Fan-out per area tematica.** Lancia ricerche web parallele (un agente per
   area, come il giro del 2026-07-07):
   - scadenze e proroghe dell'anno (decreti, conversioni in legge);
   - acconti (percentuali, soglie, split — pagine AdE);
   - sanzioni e ravvedimento (art. 13 D.Lgs. 471/1997 e 472/1997 e riforme);
   - tasso legale (DM MEF di dicembre, GU) e interessi di rateazione;
   - termini su atti notificati (bonari, ricorso, adesione, riscossione/AdER);
   - codici tributo F24 (risoluzioni AdE recenti);
   - calendario civile (nuove festività, regole di slittamento).

   Per ogni valore pretendi **fonte primaria** (AdE, GU/Normattiva, DM) o
   almeno due fonti di stampa fiscale professionale concordanti; annota quale.

3. **Diff contro il registro.** Per ogni costante: confermata (aggiorna solo
   `verificatoIl`), divergente (valore/modello da correggere), o nuova
   esigenza (es. nuovo scaglione temporale, nuova vigenza da appendere alle
   tabelle tempo-indicizzate).

4. **Report per il sign-off.** Presenta all'utente: divergenze con valore
   attuale vs verificato, fonte e impatto (quale tool produce numeri
   sbagliati); conferme in blocco; buchi di vigenza in arrivo (es. "manca il
   tasso legale dell'anno prossimo: il DM esce a dicembre").

5. **Dopo il sign-off, applica nel registro** (mai solo nel report): aggiorna
   valori/vigenze/`verificatoIl`, aggiungi test per ogni valore cambiato,
   esegui `npm run test`. Se cambia il *modello* (trigger, scaglioni), tratta
   il consumatore (`ravvedimento.ts`, `termini.ts`…) nella stessa sessione.

6. **Chiudi il giro**: annota la verifica in
   `companies/dott-comm/journal.md` (data, aree coperte, divergenze trovate).
   Se emergono fatti nuovi di dominio, aggiornali in
   `content/knowledge/manutenzione-costanti-fiscali.md`.

## Regole

- **Mai fidarsi della conoscenza pregressa del modello** per i valori: ogni
  numero si verifica su fonte viva. La conoscenza pregressa serve solo a
  sapere DOVE guardare.
- **Vigenze, non sovrascritture**: per i valori annuali (tasso legale, rate
  AdER) si APPENDE una voce alla tabella, non si sostituisce quella vecchia —
  i calcoli pro-rata sul passato dipendono dalle voci storiche.
- Se una fonte primaria non è raggiungibile, registra il valore con la
  migliore fonte secondaria e segnala il caveat nel report (come fatto per il
  D.L. 89/2026 in attesa di conversione).
- Le costanti nuove entrano SOLO con fonte e `verificatoIl` compilati: un tool
  non spedisce con valori a provenienza vuota (regola del gate, ADR 0011).
