---
title: Detrazione spese sanitarie — capability MCP e regole fiscali
status: active
owner: pvalfre
updated: 2026-07-07
tags: [mcp, spese-sanitarie, detrazione, 730, fiscal-engine, s13]
---

# Detrazione spese sanitarie — capability MCP e regole fiscali

_Source of truth su cosa fa la capability S13 (estrazione scontrini → detrazione
spese sanitarie), come è costruita e le regole fiscali che implementa (verificate
sulle istruzioni del Modello 730/2026, periodo d'imposta 2025). Decisione:
[ADR 0012](../decisions/0012-estrazione-scontrini-detrazione-sanitaria.md)._

## Cosa serve al cliente (via MCP)

Consegna a tre pezzi, tutta servita dal server MCP (`code/`), niente
`.claude/skills` di repo:

| Tipo | Nome | Cosa fa |
|---|---|---|
| Tool (gated) | `detrazione_sanitaria` | Aritmetica a peso legale: subtotali per rigo E1–E5, stima detrazione, scarti (non detraibili / tracciabilità), avvisi (rateizzazione, doppi conteggi), E25 come deduzione a parte, e il "foglio" come blocco **CSV** pronto da salvare/importare. Schema colonne configurabile via `colonne`. |
| Prompt ("skill") | `metodo_estrazione_spese_sanitarie` | La **procedura end-to-end** che il client segue: chiedi-e-ricorda dove sono i documenti e dove fare il calcolo (`config.md`), raccogli, estrai con la vista, chiama il tool, scrivi il foglio. Include le regole di classificazione. |
| Convenzione | `convenzione_studio_db` (esteso) | Nuovi file client-local `studio/spese-sanitarie/<cliente>-<anno>.csv` (il riepilogo, audit trail) e `studio/spese-sanitarie/config.md` (preferenze apprese: fonte documenti, destinazione calcolo, schema colonne). |

Il server non ha filesystem né stato di dominio (ADR 0003): il foglio sono **dati
emessi dal tool**, salvati e importati dal client. Ogni output è una **bozza**
(human-in-the-loop): la detrazione definitiva la calcola il sostituto/CAF
sull'imposta capiente.

## Il codice

- `src/lib/fiscal/detrazioni-sanitarie.ts` — modulo puro e testato:
  `calcolaDetrazioneSanitarie(voci)` e `valutaVoce`. Nessuna costante nuda: le
  costanti a peso legale vivono nel registro (ADR 0011).
- `src/lib/fiscal/constants.ts` — costanti registrate: `DETRAZIONE_SANITARIE_ALIQUOTA`
  (19%), `FRANCHIGIA_SANITARIE` (€129,11), `SOGLIA_RATEIZZAZIONE_SANITARIE`
  (€15.493,71), `N_RATE_DETRAZIONE_SANITARIE` (4), `CAP_E2_PATOLOGIE_ESENTI`
  (€6.197,48), `CAP_E4_VEICOLI_DISABILI` (€18.075,99). Tutte con `fonte` +
  `verificatoIl` → entrano nel giro `/verifica-costanti`.
- `src/lib/mcp/skills/detrazione-sanitaria.ts` — il tool gated (`registerGatedTool`).
- `src/lib/mcp/prompts.ts` — il prompt della procedura + la convenzione.
- Test: `src/lib/fiscal/__tests__/detrazioni-sanitarie.test.ts` (aritmetica) +
  casi in `src/lib/mcp/__tests__/tools-e2e.test.ts` (attraverso il vero server).

## Le regole fiscali (verificate sulle istruzioni 730/2026, periodo 2025)

Fonte primaria: *Istruzioni Modello 730/2026* (agg. 28/05/2026), Quadro E Sez. I;
guida AdE "Spese sanitarie". Punti chiave implementati:

- **Aliquota 19%** sull'eccedenza della **franchigia €129,11**. La franchigia è
  **unica** e si applica alla **somma E1(col.1+col.2) + E2** (E2 già capato):
  `19% × max(0, (E1 + min(E2, 6.197,48)) − 129,11)`. *Non* una franchigia per
  rigo (era il bug iniziale: E2 separato sovra-stimava fino a ~€24,53 quando E1 <
  129,11).
- **E1 col.2** = spese generiche; **col.1** = patologie esenti. **E2** =
  familiari NON a carico con patologie esenti, cap €6.197,48, solo per la quota
  non capiente nell'IRPEF del malato (dato esterno → la stima è un massimo).
- **E3** (disabili): **solo** mezzi di ausilio/deambulazione/sollevamento e
  sussidi tecnici e informatici → 19% **sull'intero importo, senza franchigia**.
  ⚠️ Le **visite/prestazioni** di un disabile vanno in **E1** (con franchigia);
  le **spese mediche generiche e di assistenza specifica** dei disabili vanno in
  **E25** come **onere DEDUCIBILE** (riducono il reddito, Sez. II), *non* 19%.
  Il tool tiene E25 separato e avvisa; non instradare quelle spese in E3.
- **E4** (veicoli disabili): 19% su `min(spesa, 18.075,99)`, una volta in 4 anni.
  **E5** (cane guida): 19% sull'intero importo.
- **Tracciabilità** (art. 1 c.679-680 L.160/2019): pagamento tracciabile
  obbligatorio, con **3 eccezioni** (contanti ammessi): farmaci, dispositivi
  medici, prestazioni di strutture pubbliche o private **accreditate SSN**.
  Senza tracciabilità dove serve → detrazione persa (il tool scarta la voce).
- **Rimborsi** (assicurazione/fondo/datore): la quota rimborsata non è
  detraibile → scorporata.
- **Rateizzazione**: se E1+E2+E3 (al lordo della franchigia) > €15.493,71, la
  detrazione è ripartibile in 4 quote annuali (quote 2ª-4ª nel rigo E6 gli anni
  dopo).
- **Esclusione dai tetti reddito**: le spese sanitarie NON subiscono né la
  riduzione art. 15 c.3-bis (120k/240k) né il tetto oneri art. 16-ter
  (L. 207/2024, > 75k) — detraibili al 19% a ogni livello di reddito.
- **Scontrino "parlante"** valido solo con: codice fiscale del contribuente +
  natura + codice AIC + quantità. Fattura medica esente IVA > €77,47 → marca da
  bollo €2. Documenti da conservare fino al 31/12 del 5° anno successivo.

## Cosa NON copre la v0 (limiti noti)

- La stima E2 non conosce l'incapienza reale del familiare malato (massimo
  teorico, segnalato).
- Stato pluriennale delle rate E4/E5 e riporto E6 non modellati.
- E25 è *segnalato* come deduzione, non calcolato nel reddito imponibile.
- Scrittura diretta su Google Sheet: il tool emette CSV, l'import lo fa il client.

## Come usarla / testarla

- Unit + e2e: `cd code && npm run test` (116 test).
- Il flusso reale: il cliente connette il server MCP, invoca la procedura
  (`metodo_estrazione_spese_sanitarie`), il client estrae dai documenti e chiama
  `detrazione_sanitaria`, salva il CSV in `studio/spese-sanitarie/` e lo importa
  nel foglio dello studio.

## Related

- [ADR 0012](../decisions/0012-estrazione-scontrini-detrazione-sanitaria.md) (decisione),
  [ADR 0011](../decisions/0011-registro-costanti-fiscali-provenienza.md) (registro costanti),
  [ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md) (client-local).
- [problem-space.md](./problem-space.md) (S7 `estrai-documenti`, area 01/02),
  [catalogo-skills-tools.md](../brainstorms/catalogo-skills-tools.md) (§ Stato build).
