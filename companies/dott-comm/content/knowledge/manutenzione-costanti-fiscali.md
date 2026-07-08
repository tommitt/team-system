---
title: Manutenzione delle costanti fiscali — processo e responsabilità
status: active
owner: ttassi
updated: 2026-07-07
tags: [fiscal-engine, costanti, compliance, processo, manutenzione]
---

# Manutenzione delle costanti fiscali — processo

_Come teniamo corrette le costanti a peso legale del motore fiscale. I VALORI
non vivono qui: la source of truth è il registro in codice
(`code/src/lib/fiscal/constants.ts` via `registry.ts`), dove ogni costante
porta `{ valore, fonte, verificatoIl }` — vedi
[ADR 0011](../decisions/0011-registro-costanti-fiscali-provenienza.md)._

## Il modello

- **Costante scalare**: `costante(valore, fonte, verificatoIl)`.
- **Valore che cambia nel tempo** (tasso legale, rate AdER, festività…):
  tabella di `VoceVigente` con `vigenzaDa/vigenzaA`, consultata per data con
  `lookupVigente`. Le vigenze storiche si APPENDONO, mai si sovrascrivono
  (i pro-rata sul passato dipendono dalle voci vecchie).
- **Fuori vigenza / mai verificato**: il lookup restituisce comunque il valore
  più plausibile ma con `verificato: false` e una nota; i tool la espongono
  nell'output. Il failure mode è un caveat rumoroso, mai un numero stantio
  silenzioso.
- **Regola del gate**: nessun tool spedisce con costanti senza fonte e
  `verificatoIl`. I grandi dataset (tabelle ACI, addizionali comunali) non
  sono costanti: finché non abbiamo un data-asset versionato, il tool chiede
  il dato all'utente.

## Il processo di ri-verifica

La skill **`/verifica-costanti`** (company-scoped, in
`companies/dott-comm/.claude/skills/`) fa il giro completo:
legge il registro → fan-out di ricerche web per area tematica → diff → report
di divergenze per sign-off umano → applica nel registro con test. Il metodo è
il prototipo del 2026-07-07 (7 agenti paralleli, fonte + data per costante).

**Cadenza:**

| Quando | Perché |
|---|---|
| Dicembre–gennaio | Rollover annuale: DM MEF tasso legale, legge di bilancio, nuove festività, codici/aliquote |
| Prima di ogni campagna (20/7, 30/11, stagione dichiarativi) | I valori del picco devono essere freschi al momento dell'uso |
| Su evento normativo (decreto, conversione, correttivo) | Le riforme cambiano anche i MODELLI, non solo i valori |

## Stato e storia

- **2026-07-07 — verifica di massa** (fonti: AdE, GU, DM MEF + stampa fiscale
  concordante). Tutte le costanti di `constants.ts`, `f24-codici.ts`,
  `calendario.ts`, `termini.ts` verificate; 5 divergenze trovate e applicate
  con la migrazione al registro: tasso legale 2026 (1,60%, era fermo al 2%),
  termini bonari 60/90 gg (D.Lgs. 108/2024, erano 30/60), scaglioni
  ravvedimento b-bis/b-ter rimodellati a trigger (D.Lgs. 87/2024), festività
  4/10 dal 2026 (L. 151/2025), rate AdER a scaglioni 84/96/108 per
  anno-istanza (D.Lgs. 110/2024). Codici F24: tutti confermati.
- **Caveat aperti** (da chiudere al prossimo giro):
  - conversione in legge del **D.L. 89/2026** (termine ~21/7/2026): le
    scadenze del cuneo sono verificate solo su decreto + stampa;
  - **tasso legale 2024** (2,50%): da conoscenza pregressa, mai riverificato
    (`verificatoIl: null` nel registro);
  - regime sanzionatorio **pre-riforma** (violazioni ante 1/9/2024, base 30%):
    non modellato — il motore avvisa e non calcola quel caso.

## Related

- [ADR 0011 — la decisione](../decisions/0011-registro-costanti-fiscali-provenienza.md)
- [ADR 0003 — stato client-local](../decisions/0003-track-a-stateless-client-local-state.md)
- Skill: `companies/dott-comm/.claude/skills/verifica-costanti/SKILL.md`
- Codice: `code/src/lib/fiscal/{registry,constants,f24-codici,calendario,termini,ravvedimento}.ts`
