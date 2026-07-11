---
title: Corpus di retrieval — architettura e operazioni
status: active
owner: ttassi
updated: 2026-07-10
tags: [rag, corpus, retrieval, grounding, postgres, pgvector, mcp, ingestione, operazioni]
---

# Corpus di retrieval — architettura e operazioni

_Come Dott. Comm. ground-a le risposte alle **domande puntuali** su fonti
ufficiali citabili. Decisione: [ADR 0014](../decisions/0014-corpus-fonti-pubbliche-retrieval.md).
Fonti da indicizzare ed esclusioni: [biblioteca-commercialisti.md](../brainstorms/biblioteca-commercialisti.md)._

## Il principio in una riga

La conoscenza del commercialista non è testo piatto: è una **gerarchia
citazionale con un asse temporale**. La prassi spiega, la norma è l'autorità,
ogni regola vale solo per certi anni d'imposta. Perciò provenienza, citazioni
normative e validità temporale sono **metadati di prima classe**, non commenti —
e il fallimento da evitare è il *default stantio silenzioso* (una regola 2023
per una domanda 2026), lo stesso di [ADR 0011](../decisions/0011-registro-costanti-fiscali-provenienza.md).

## Architettura

```
ingestione (CLI, tsx)          →  Postgres (Supabase)          →  MCP (Vercel)
  normattiva.ts   ─┐              corpus_documenti                corpus_cerca
  prassi-ade.ts    ├─ chunk +     corpus_chunks (tsv + vector)    corpus_leggi
  istruzioni.ts   ─┘  citazioni   corpus_citazioni (grafo)        corpus_norma
  embed-missing.ts →  embedding   corpus_ingestion_runs           corpus_indice
  enrich/…batch.ts →  note/LLM    corpus_note_redazionali          (embed query +
                                  corpus_hybrid_search() ─────────┘  rerank-3.5)
```

- **Corpus = sole fonti pubbliche gratuite**: `prassi_ade` (circolari,
  risoluzioni, interpelli — 2023→oggi), `istruzioni_modelli` (manifest per anno),
  `normattiva` (TUIR, DPR 633/72, D.Lgs. 546/92 nel pilota). Nessun libro
  editoriale (blindati: opt-out TDM). Carve-out esplicito all'ADR 0003: nessun
  dato di studio o cliente in queste tabelle.
- **Retrieval ibrido in Postgres**, non un vector DB dedicato: `tsvector`
  (`italian`, ranking `ts_rank_cd` — non BM25 stretto) + `pgvector` (HNSW, coseno,
  1024 dim) fusi con **Reciprocal Rank Fusion** nella funzione SQL
  `corpus_hybrid_search` (versionata nello schema dichiarativo, `04_corpus.sql`;
  chiamata via `.rpc()` col client service-role).
- **Embeddings: Cohere embed-v4** (1024 dim). Si embedda `percorso + '\n' + testo`
  (contextual retrieval): il percorso gerarchico è il metadato più prezioso.
- **Reranker: Cohere rerank-3.5** (`src/lib/corpus/rerank.ts`). La funzione SQL
  restituisce un pool ampio (≈40); il reranker lo riordina per rilevanza vera
  query↔passaggio e lo taglia al top-N. È il lever di qualità più grande dopo il
  chunking. **Due interruttori espliciti** (`config.ts`): `CORPUS_EMBEDDINGS` e
  `CORPUS_RERANK`, opt-out, default on con la chiave. Entrambe le degradazioni
  (embedding e rerank assenti o falliti) sono **dichiarate** nell'output: mai un
  risultato peggiore spacciato per uno buono.
- **Grafo citazionale prassi→norma**: `corpus_citazioni` collega ogni chunk agli
  atti che cita; `corpus_norma` fa il reverse-lookup (dato un articolo, chi lo
  cita). Estrazione **regex-first** (deterministica, auto-approvata) + **LLM** per
  l'ellittico via **fan-out di subagenti** (skill `/arricchisci-citazioni`, sotto
  l'auth della sessione — niente chiave API tier-1), `approvata=false` finché la
  verifica+sign-off (ultimo passo della stessa skill) non conferma il grounding.

## I quattro tool `corpus_*`

Non un solo `cerca()` (trappola RAG one-shot): le mosse di un ricercatore umano.

| Tool | Cosa fa |
|---|---|
| `corpus_cerca(domanda, anno_imposta?, fonte?, max_risultati)` | Ricerca ibrida con filtri; ogni hit porta estremi, sezione, pagina, URL. **Avviso temporale obbligatorio** se l'anno è fuori vigenza/copertura. |
| `corpus_leggi(chunk_id, contesto)` | Espande i chunk adiacenti (i chunk trovano, le sezioni si leggono). |
| `corpus_norma(riferimento, anno_imposta?)` | Testo dell'articolo + prassi che lo cita (grafo). Accetta ogni grafia ("art. 51 TUIR"). |
| `corpus_indice(fonte?, anno?)` | Elenco documenti + copertura + ultima ingestione. |

Regole dure applicate nei tool (non lasciate al modello): **nessuna fonte
recuperata, nessuna asserzione**; **avviso temporale prima dei risultati**; ogni
output finisce con `DISCLAIMER_BOZZA`. Le istruzioni del server MCP dicono di
chiamare `corpus_cerca` prima di rispondere a una domanda di merito.

## Operazioni

Prerequisiti: `COHERE_API_KEY` (script di embedding + app per la query). L'arricchimento
citazioni NON usa la chiave API Anthropic: gira a subagenti sotto l'auth della
sessione. Runbook stack locale: [local-dev-testing.md](./local-dev-testing.md).

```bash
# 1. Ingestione (on demand, in sessione Claude Code). Idempotente: rieseguire è un no-op.
npm run ingest:normattiva -- --limit 1 --dry-run   # spike; poi senza --dry-run
npm run ingest:prassi -- --anno 2023 --limit 5
npm run ingest:istruzioni -- --anno 2026
#   flag comuni: --anno --limit --dry-run --incremental

# 2. Embedding dei chunk nuovi (disaccoppiato dal parsing, ripartibile).
#    Gestisce il rate limit per-minuto delle chiavi Cohere trial (attese + passo fra i lotti).
npm run ingest:embed -- --limit 500

# 3. Arricchimento citazioni ellittiche + verifica + sign-off: skill /arricchisci-citazioni
#    (fan-out di subagenti Haiku; prep-candidates → subagenti → verifica-citazioni).
#    Nessuna Batch API, nessuna chiave tier-1: gira sotto l'auth della sessione.
```

Schema: modifiche via flusso dichiarativo (ADR 0007) su `supabase/schemas/04_corpus.sql`.
**Attenzione**: `supabase db diff` (pg-delta) **non emette le REVOKE sui privilegi
di funzione** — `corpus_hybrid_search` è `security definer`, quindi la `REVOKE …
FROM PUBLIC` va riaggiunta a mano in coda alla migrazione generata (com'è nel
migration del 2026-07-10). Senza, la funzione sarebbe chiamabile da `anon`.

## Contratti chiave

- **Idempotenza adapter**: stesso `identificativo` + stesso `hash_contenuto` →
  skip; hash cambiato → delete+reinsert dei chunk in transazione, bump
  `verificato_il`; ogni run scrive una riga in `corpus_ingestion_runs`.
- **Provenienza citabile**: `percorso` gerarchico completo ("DPR 917/1986 >
  TITOLO I > Capo IV > Art. 51 — …"), `pagina_da/a`, `url_origine` su ogni hit.
- **Degradazione dichiarata**: senza chiave Cohere (o con `CORPUS_EMBEDDINGS=false`)
  `corpus_cerca` scende al solo full-text; se il reranker cade tiene l'ordine RRF
  grezzo. Entrambe le degradazioni sono dette nell'output (`ibrida`/`rerankata`
  + note) — mai un risultato peggiore spacciato per buono.
- **Contenuto generato dietro gate**: citazioni `metodo='llm'` e note
  redazionali escono da un tool solo dopo `approvata=true` / `stato='approvata'`.

## Quirks delle fonti (verificati 2026-07-10)

- **Normattiva**: il resolver URN apre la sessione (cookie); l'export **Akoma
  Ntoso** va scaricato NELLA STESSA SESSIONE (senza cookie risponde 200 con una
  pagina d'errore HTML). I contenitori AKN sono `<chapter>` piatti: la gerarchia
  (TITOLO/Capo/Sezione) si ricostruisce da uno stack sul `<num>`. Gli articoli
  modificati riversano il testo nel `<heading>` — va recuperato nel corpo.
- **Prassi AdE**: i link mese si **ricavano** dalla pagina-anno, non si
  costruiscono (l'AdE ha refusi nei propri URL, es. `settembre-2023-intepelli_`).
  L'indice dei PDF (righe coi puntini di guida) va mascherato prima di chunkare.
- **Istruzioni modelli**: `unpdf` estrae pulito i PDF multi-colonna (ancore
  QUADRO/SEZIONE/Rigo) — la escape hatch Python/PyMuPDF prevista NON è servita.
  `anno_imposta = anno modello − 1`.

## Rinviato (per decisione esplicita, ADR 0014)

- **Golden set + eval harness**: non ancora scritto. Gli adapter sono già
  incrementali/idempotenti e ogni run è loggato, così si aggiunge senza redesign.
- **Automazione refresh** (cron GitHub Actions): refresh manuale via CLI. Gli
  adapter sono già pronti; automatizzare è solo un workflow file + secret.
- **Note redazionali** (strato "Memento" generato): tabella già creata; il diff
  di produzione e il pass LLM sono un follow-up.

> Il **reranker Cohere rerank-3.5**, prima rinviato, è ora implementato (vedi
> §Architettura e gli interruttori `CORPUS_EMBEDDINGS`/`CORPUS_RERANK`).
