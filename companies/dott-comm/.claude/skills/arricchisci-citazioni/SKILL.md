---
name: arricchisci-citazioni
description: Enrich the corpus citation graph by fanning out subagents that extract the elliptical/ambiguous normative citations the regex pass missed, then verify and sign them off — all in one loop, no separate pipeline. Run after ingesting new prassi/istruzioni, or when `corpus_norma`'s reverse-lookup feels thin. Triggers include "arricchisci le citazioni", "enrich citations", "completa il grafo citazionale", "run citation enrichment".
---

# Arricchisci le citazioni — estrazione a subagenti + verifica + sign-off

Il grafo citazionale prassi→norma (ADR 0014) nasce **regex-first**: le citazioni
esplicite ("art. 51 del DPR 917/1986") le prende un estrattore deterministico,
`approvata=true` all'origine. Restano quelle **ellittiche/ambigue** ("ai sensi
del medesimo articolo", riferimenti diluiti nel periodo) che la regex scarta di
proposito — indovinare l'atto corromperebbe il grafo.

Questa skill copre quel residuo con un **fan-out di subagenti**: ogni subagent
è un modello Claude che estrae le citazioni con la propria intelligenza (nessuna
chiamata API, nessuna chiave tier-1 — gira sotto l'auth della sessione, quindi
niente rate limit da 5 req/min). L'estrazione atterra `approvata=false`, e la
**verifica + il sign-off sono l'ULTIMO passo di questa stessa skill**: niente
pipeline separata che può driftare. La regola resta quella dell'ADR 0011: mai
un valore a peso legale non verificato che esce da un tool.

## Prerequisiti

- Girare in una sessione Claude Code (serve il tool Agent per i subagenti).
- `code/.env.prod` con `DATABASE_URL` verso il DB di produzione (gli script
  leggono da lì). **Non serve `ANTHROPIC_API_KEY`**: i subagenti sono il modello.
- Corpus già ingerito (`npm run ingest:*` + `ingest:embed`).
- Tutti i comandi si lanciano da `companies/dott-comm/code/`.

## Procedura

1. **Scopri e prepara i candidati.** Pesca dal DB i chunk di prassi/istruzioni
   che parlano di articoli e non hanno ancora citazioni LLM, e spezzali in N
   gruppi:
   ```bash
   npx tsx scripts/enrich/prep-candidates.mts 8 96   # 8 gruppi, max 96 chunk
   ```
   Stampa `{ totale, gruppi: [{file, out, n}] }`. Se `totale` è 0 → niente da
   fare, chiudi. Alza il cap (2º argomento) per giri più ampi; tieni presente
   che ogni citazione va poi rivista, quindi non esagerare in un colpo solo.

2. **Fan-out dei subagenti.** Spawna **un subagent Haiku per gruppo**, in
   parallelo (tutti in un solo messaggio). Prompt per il gruppo K (0..N-1):

   > You are enriching a legal-citation graph for an Italian tax corpus. Work
   > inside `companies/dott-comm/code`.
   > 1. Read `.enrich-tmp/group-K.json` — `[{id, testo}]`, passages of Italian
   >    tax practice.
   > 2. For EACH chunk, extract every EXPLICIT normative citation (legge / DPR /
   >    D.Lgs. / TUIR where the act is NAMED **in this chunk's text**). Rules,
   >    ferree: extract ONLY what is literally in `testo`; do NOT use your own
   >    knowledge of Italian tax law to fill in an act the text doesn't name; if
   >    a reference is elliptical and the text doesn't name the act, SKIP it;
   >    never invent estremi. When unsure, omit.
   > 3. For EACH citation include `quote`: the **verbatim substring of `testo`**
   >    (copied exactly, ~5–20 words) that names the act — e.g. `"art. 29 del
   >    D.L. n. 179/2012"`. If you cannot copy such a span verbatim from `testo`,
   >    you do NOT have a citation — drop it.
   > 4. Write `.enrich-tmp/out-K.json` =
   >    `[{chunk_id, atto, articolo, comma, quote}]` (empty strings where a field
   >    is absent; `[]` if none).
   > 5. Run `npx tsx scripts/enrich/write-citazioni.mts .enrich-tmp/out-K.json`.
   > 6. Report only: chunks processed, entries written, and the script's final
   >    `write-citazioni(...)` line.

   Usa `model: haiku` (basta per un'estrazione vincolata) — o `sonnet` per
   volumi ostici. **`write-citazioni.mts` è il gate anti-allucinazione**: scarta
   a monte ogni citazione la cui `quote` non è davvero una sottostringa del
   chunk (il modello non può inventare un atto senza inventare una quote
   inesistente, e quella non passa). Poi normalizza (forma canonica + URN),
   deduplica, e scrive `metodo='llm', approvata=false`, con la quote come
   `testo_grezzo`.

3. **Verifica.** Guarda cosa è atterrato:
   ```bash
   npx tsx scripts/enrich/verifica-citazioni.mts
   ```
   **auto-grounded** = l'atto del riferimento è nominato dentro la quote (o è un
   alias noto, "TUIR"/"statuto"); **da rivedere** = quote reale ma l'atto non vi
   compare → possibile *misattribuzione* (il modello ha legato una quote vera
   all'atto sbagliato).

4. **Firma.**
   ```bash
   npx tsx scripts/enrich/verifica-citazioni.mts --approva-grounded
   ```
   Per le "da rivedere", **leggi il chunk** (`corpus_leggi` o query su
   `corpus_chunks.testo`) e decidi: `--approva <ids>` se la quote nomina davvero
   quell'atto, `--rigetta <ids>` se è misattribuzione (mai lasciare
   `approvata=false` a marcire). Agiscono SOLO su `metodo='llm'` non ancora
   approvate: regex e già-firmate non si toccano mai.

5. **Loop di correzione (until-dry).** Il gate anti-allucinazione fa sì che un
   chunk mal estratto NON perda le sue citazioni vere: le buone entrano, le
   inventate cadono, e — se restava a zero — il chunk **ritorna candidato** al
   giro dopo (la query di `prep-candidates` prende i chunk senza citazioni LLM).
   Quindi **ripeti i passi 1–4** finché `prep-candidates` non trova più (quasi)
   nulla di nuovo (di solito 2–3 giri). Ogni giro converte over-reach in
   estrazioni corrette o in drop puliti — non si itera a vuoto sugli stessi
   errori come farebbe un unico passo. Se un giro è tutto rumore, alza il modello
   a `sonnet` o rafforza la regola "solo dal testo" nel prompt (passo 2).

6. **Chiudi.** `rm -rf code/.enrich-tmp` e annota il giro in
   `companies/dott-comm/journal.md` (candidati, approvate, rigettate, giri di
   correzione). Se emerge un pattern d'errore ricorrente (confonde due decreti
   simili), annotalo: è un candidato a raffinare il prompt del passo 2.

## Regole

- **Il grounding è il gate, non la fiducia nel modello.** Una citazione LLM esce
  da un tool solo dopo `approvata=true`, e si approva solo se il testo del chunk
  contiene davvero l'atto. Nel dubbio, `--rigetta`.
- **Le regex non si verificano qui**: sono meccaniche e già approvate. Se una
  regex ha prodotto una citazione sbagliata, il bug è nel parser
  (`src/lib/parse/riferimenti-norma.ts` / `scripts/ingest/lib/citazioni.ts`):
  correggi il codice e aggiungi un test, non il singolo record.
- **Un solo posto per l'arricchimento.** Estrazione, verifica e firma vivono in
  questa skill: non c'è una pipeline batch separata (rimossa per evitare drift).
- **Subagenti, non la chiave API.** Il fan-out gira sotto l'auth della sessione:
  non tocca `ANTHROPIC_API_KEY` né il suo rate limit. Non reintrodurre una via
  che chiama l'API a pagamento per questo.
