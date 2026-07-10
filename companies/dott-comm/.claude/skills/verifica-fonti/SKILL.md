---
name: verifica-fonti
description: Review and sign off the corpus's LLM-generated citations and note redazionali before they become visible to users (ADR 0014). Run after an enrichment pass (`npm run enrich:citazioni`) or when the pending queue grows. Never trust the model's legal inferences without human review. Triggers include "verifica le fonti", "sign off the corpus", "approva le citazioni", "ci sono citazioni da approvare?".
---

# Verifica delle fonti — il sign-off dello strato generato del corpus

Il corpus (ADR 0014) ha due tipi di contenuto: quello **derivato meccanicamente**
dalle fonti ufficiali (chunk, citazioni regex — deterministico, si fida) e quello
**generato da un modello** (citazioni ellittiche estratte dall'LLM, note
redazionali "stile Memento"). Il secondo **non esce mai da un tool finché un
umano non lo approva**: `corpus_citazioni.approvata` e
`corpus_note_redazionali.stato` sono i gate.

Questa skill porta la coda del pending al sign-off. È il gemello di
`/verifica-costanti` (ADR 0011): stesso principio — **mai fidarsi della
conoscenza pregressa del modello per valori a peso legale**; il modello serve a
proporre, l'umano a decidere.

## Quando gira

- Dopo un pass di arricchimento (`npm run enrich:citazioni`), che deposita
  citazioni `metodo='llm', approvata=false`.
- Quando arriva il diff delle note redazionali (Fase follow-up di ADR 0014).
- Prima di una campagna, come controllo che il pending non si sia accumulato.

## Procedura

1. **Conta e mostra il pending.** Il DB è locale (`npm run db:start`) o quello di
   Vercel. Leggi le citazioni da approvare, raggruppate per documento, con il
   testo grezzo e il chunk di provenienza:

   ```sql
   select d.estremi, c.riferimento, c.testo_grezzo, ch.percorso, c.chunk_id
   from corpus_citazioni c
   join corpus_chunks ch on ch.id = c.chunk_id
   join corpus_documenti d on d.id = ch.documento_id
   where c.metodo = 'llm' and not c.approvata
   order by d.estremi, c.chunk_id;
   ```

   Per le note redazionali:

   ```sql
   select n.id, d.estremi, ch.percorso, n.testo, n.modello
   from corpus_note_redazionali n
   join corpus_chunks ch on ch.id = n.chunk_id
   join corpus_documenti d on d.id = ch.documento_id
   where n.stato = 'bozza'
   order by d.estremi;
   ```

2. **Verifica ogni voce sul chunk, non a memoria.** Per ciascuna citazione LLM:
   apri il chunk (`corpus_leggi` o una query su `corpus_chunks.testo`) e controlla
   che il riferimento **sia davvero nel testo** e che l'atto sia quello giusto —
   il modello può aver disambiguato male un'ellissi ("il medesimo articolo").
   Per le note redazionali: controlla che la spiegazione sia fedele alla fonte,
   non aggiunga regole non presenti, e non riproduca verbatim lunghi passaggi di
   testi coperti da copyright (le norme no, sono pubbliche; ma una nota che
   parafrasa un manuale sì).

3. **Report per il sign-off.** Presenta all'utente, in blocco:
   - citazioni da **confermare** (riferimento corretto, presente nel testo);
   - citazioni da **scartare** (ellissi mal risolta, atto sbagliato, inventato);
   - note da **approvare** / da **rivedere**, con il perché.
   Chiedi conferma esplicita. **Non applicare nulla senza sign-off.**

4. **Dopo il sign-off, applica.** Le confermate diventano visibili; le scartate
   si eliminano (non si lasciano `approvata=false` a marcire):

   ```sql
   -- confermate
   update corpus_citazioni set approvata = true where id in (...);
   -- scartate
   delete from corpus_citazioni where id in (...);
   -- note approvate
   update corpus_note_redazionali set stato = 'approvata' where id in (...);
   ```

   Nota: le citazioni `metodo='regex'` sono già `approvata=true` all'origine
   (deterministiche) — questa skill NON le tocca. Se rilanci
   `collegaCitazioniAiDocumenti` (o ri-ingerisci una norma) gli archi verso i
   documenti si richiudono da soli.

5. **Chiudi il giro.** Annota la verifica in `companies/dott-comm/journal.md`
   (data, quante citazioni/note viste, quante scartate). Se emergono pattern di
   errore ricorrenti del modello (es. confonde sempre due decreti), valuta di
   raffinare il prompt in `scripts/enrich/citazioni-batch.ts` o di alzare il
   modello a `claude-sonnet-5` per quei volumi.

## Regole

- **Mai fidarsi dell'inferenza del modello sui valori a peso legale.** Una
  citazione sbagliata che esce da un tool è un danno: mina la fiducia del
  professionista. Nel dubbio, scarta.
- **Le regex non si verificano qui**: sono meccaniche e già approvate. Se una
  regex ha prodotto una citazione palesemente sbagliata, il bug è nel parser
  (`src/lib/parse/riferimenti-norma.ts` / `scripts/ingest/lib/citazioni.ts`),
  non nel dato — correggi il codice e aggiungi un test, non il singolo record.
- **Le note redazionali sono nostre parole, non della fonte**: l'output deve
  sempre distinguerle dal testo citato (il formatter già le marca "📝 Nota
  redazionale"). Non approvare una nota che si spaccia per fonte.
- **Vigenze, non sovrascritture**: se una nota cambia perché è cambiata la
  norma, si aggiunge una versione nuova e si segna la vecchia superata — non si
  riscrive la storia (stesso principio delle vigenze in ADR 0011).
