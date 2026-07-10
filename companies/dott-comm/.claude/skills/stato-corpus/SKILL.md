---
name: stato-corpus
description: Report the corpus retrieval pipeline's status in prod — how many ingestions, embeddings, and citation enrichments are missing — in one read-only pass, and point each gap to the command that closes it. Run before/after an ingestion campaign, to check whether prod is complete, or when someone asks "a che punto è l'indicizzazione / il corpus / gli embedding / l'arricchimento?". Triggers include "stato del corpus", "quanto manca da ingerire/embeddare/arricchire", "verifica ingestione", "corpus status".
---

# Stato del corpus — ingestione · embedding · arricchimento

Un colpo d'occhio **read-only** sullo stato della pipeline di retrieval (ADR 0014)
in **produzione**: quante ingestioni mancano, quanti embedding mancano, quanto
resta da arricchire — e per ogni buco il comando che lo chiude. Nessuna scrittura.

## Prerequisiti

- Lanciare da `companies/dott-comm/code/`.
- `code/.env.prod` con `DATABASE_URL` verso il DB di produzione (lo script legge
  da lì; è l'unica cosa che serve — niente chiavi Cohere/Anthropic per lo stato).

## Procedura

1. **Esegui la verifica** (interroga prod, non scrive nulla):
   ```bash
   npm run ingest:status
   ```
   Stampa un JSON completo (documenti per fonte, run loggate, embedding per fonte,
   citazioni per metodo/approvazione) seguito da un blocco **`─── VERDETTO ───`**
   con una riga per stadio: `✓` = a posto, `▸` = c'è lavoro (o è una coda aperta).

2. **Leggi il verdetto e instrada ogni buco al suo comando** (tutti da `code/`):

   | Stadio | Se manca qualcosa | Comando che chiude |
   |---|---|---|
   | **normattiva** | `mancanti > 0` | `npm run ingest:normattiva` (target = `scripts/ingest/manifests/normattiva.json`) |
   | **istruzioni** | `mancanti > 0` | `npm run ingest:istruzioni -- --anno <A>` (target = `manifests/istruzioni-<A>.json`) |
   | **prassi** | manca un anno 2023→oggi | `npm run ingest:prassi -- --anno <A>` (uno per anno; sorgente **aperta**, non c'è un totale atteso) |
   | **embedding** | `senza_embedding > 0` | `npm run ingest:embed` (ripartibile; su chiave Cohere trial è lento per il rate-limit) |
   | **citazioni LLM** | `da_approvare > 0` | `npx tsx scripts/enrich/verifica-citazioni.mts` → poi `--approva-grounded` |
   | **arricchimento** | `chunk_candidati` alti | skill `/arricchisci-citazioni` |

3. **Riporta all'utente** le tre cifre chiave dal verdetto: *ingestioni mancanti*
   (normattiva/istruzioni vs manifest; per la prassi, quali anni ci sono),
   *embedding mancanti*, *arricchimento* (candidati). Se tutto è `✓`, dillo netto.

## Come leggere le cifre (trappole)

- **Prassi = sorgente aperta.** Il target è "2023→oggi": non esiste un "totale
  atteso". Completezza = ogni anno dal 2023 a quello corrente ha una run `ok` e
  dei documenti. Gli interpelli sono centinaia l'anno: numeri nell'ordine delle
  centinaia/migliaia di doc sono normali.
- **`chunk_candidati_non_arricchiti` NON è "citazioni mancanti".** È il numero di
  chunk di prassi/istruzioni che nominano "art." e non hanno ancora una citazione
  `metodo='llm'`. Gran parte ha **solo** riferimenti ellittici (nessun atto
  nominato nel testo) e resterà candidata per sempre: questa coda **non arriva
  mai a 0**, ed è corretto così (indovinare l'atto corromperebbe il grafo). Non
  trattarla come un backlog da azzerare.
- **Run `in_corso`/`errore` in `runs`** sono lo storico append-only di
  `corpus_ingestion_runs` (un'interruzione lascia una riga `in_corso`). Non
  bloccano nulla: gli adapter con `--anno` sono idempotenti e `--incremental`
  guarda solo l'ultima run `ok`. Sono rumore diagnostico, non un problema.

## Note

- Lo script è `scripts/ingest/status.mts` (read-only, `pg` diretto su
  `.env.prod`). Confronta i manifest (`scripts/ingest/manifests/`) con
  `corpus_documenti`, conta `corpus_chunks` con `embedding is null`, e le
  `corpus_citazioni` per metodo/approvazione.
- Riferimenti: architettura e operazioni in
  [content/knowledge/corpus-retrieval.md](../../content/knowledge/corpus-retrieval.md);
  arricchimento in [`/arricchisci-citazioni`](../arricchisci-citazioni/SKILL.md).
