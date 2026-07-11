---
title: Corpus di sole fonti pubbliche con retrieval ibrido in Postgres e tool MCP corpus_*
status: accepted
date: 2026-07-10
deciders: [ttassi]
supersedes:
superseded-by:
tags: [rag, corpus, retrieval, grounding, postgres, pgvector, mcp, fonti, provenienza]
---

# 0014. Corpus di sole fonti pubbliche, retrieval ibrido in Postgres, tool `corpus_*`

## Context

Dott. Comm. deve rispondere anche a **domande puntuali** ("il fringe benefit
auto 2026 come si tassa?"), non solo eseguire le procedure codificate del cuneo.
Una risposta a domanda puntuale senza fonte citabile è un danno, non un
prodotto: il professionista non può firmarla e non può verificarla.

Il documento di corpus
([`biblioteca-commercialisti.md`](../brainstorms/biblioteca-commercialisti.md),
2026-07-09) ha stabilito **cosa** indicizzare, dopo verifica di mercato: i
manuali operativi (Memento, IPSOA In Pratica, Eutekne) sono **legalmente
blindati** — nessun PDF/EPUB legale, opt-out espliciti al text-and-data-mining
ex art. 4 dir. DSM, nessuna API né licensing AI a metà 2026 — mentre **tutto il
contenuto autorevole è pubblico e gratuito** (prassi AdE, istruzioni ai modelli,
Normattiva), più pulito da parsare e sempre corrente.

Resta da decidere **come**: la conoscenza del commercialista non è testo piatto,
è una **gerarchia citazionale con un asse temporale**. La prassi spiega, la
norma è l'autorità, e ogni regola vale solo per certi anni d'imposta. Un sistema
che tratta il corpus come un sacco di paragrafi recupera testo plausibile e
produce comunque risposte sbagliate — tipicamente una regola 2023 per una
domanda 2026. È lo stesso failure mode che l'[ADR 0011](0011-registro-costanti-fiscali-provenienza.md)
ha già affrontato per le costanti: **il default stantio silenzioso**.

## Decision

1. **Corpus = sole fonti ufficiali gratuite.** Tre `fonte` in v0: `prassi_ade`
   (circolari, risoluzioni, interpelli — backfill **2023 → oggi**),
   `istruzioni_modelli` (manifest esplicito per anno), `normattiva` (TUIR,
   DPR 633/72, D.Lgs. 546/92 nel manifest pilota). Nessun libro entra
   nell'indice. Lo strato di spiegazione "da Memento" lo **generiamo noi** con
   un pass di arricchimento LLM sotto sign-off umano.

2. **Provenienza e validità temporale sono metadati di prima classe**, non
   commenti. Ogni documento porta `identificativo` (chiave naturale),
   `url_origine`, `data_pubblicazione`, `hash_contenuto`, `verificato_il`; ogni
   chunk porta `percorso` (gerarchia), `pagina_da/a`, `anno_imposta`,
   `vigenza_da/a`. **`corpus_cerca` emette un avviso temporale obbligatorio**
   quando l'`anno_imposta` chiesto cade fuori dalla vigenza del risultato o
   fuori dalla copertura del corpus — stesso contratto di `lookupVigente`
   (`verificato: false` + `nota`, ADR 0011): meglio un caveat rumoroso di un
   numero sbagliato zitto.

3. **Retrieval ibrido in Postgres, non un vector DB dedicato.** `pgvector`
   (HNSW, coseno, 1024 dim) + `tsvector` con la configurazione `italian`,
   fusi con **Reciprocal Rank Fusion** nella funzione SQL
   `corpus_hybrid_search`. A ~100k chunk un vector store dedicato è complessità
   senza guadagno; il filtro sui metadati arriva gratis. La logica di ricerca è
   versionata nello schema dichiarativo (ADR 0007) e chiamata via `.rpc()` con
   il client service-role esistente.

4. **Embeddings: Cohere embed-v4** (`output_dimension: 1024`, coseno), forte
   sull'italiano legale; lo stesso vendor fornisce il reranker multilingue
   (rerank-3.5) per uno stadio di qualità successivo. Si embedda
   `percorso + '\n' + testo` (contextual retrieval): il percorso gerarchico è il
   metadato più prezioso che abbiamo e migliora il recall in modo misurabile.

5. **Quattro tool MCP `corpus_*`, non un unico `search()`.** Un solo tool di
   ricerca è la trappola v0: diamo al modello le mosse di un ricercatore umano —
   `corpus_cerca` (ibrida + filtri), `corpus_leggi` (espandi il contesto attorno
   a un hit), `corpus_norma` (lookup diretto di un articolo + prassi che lo cita,
   via grafo citazionale), `corpus_indice` (naviga invece di cercare). Il
   prefisso è `corpus_` e non `corpus:` perché **i due punti non sono un
   carattere valido** in un nome di tool MCP (`[a-zA-Z0-9_-]`). Regola dura:
   **nessuna fonte recuperata, nessuna asserzione**.

6. **Ingestione CLI-first, non serverless.** Gli adapter girano su richiesta
   nelle sessioni Claude Code (`npm run ingest:*`, tsx): il parsing PDF pesante
   non sta nei limiti di tempo delle funzioni Vercel. Contratto di idempotenza
   per tutti: stesso `identificativo` + stesso `hash_contenuto` → skip; hash
   cambiato → delete+reinsert dei chunk in transazione; ogni run scrive una riga
   in `corpus_ingestion_runs` con un cursore incrementale.

7. **Arricchimento regex-first, LLM per il resto, verifica+sign-off nella stessa
   skill.** Le citazioni normative italiane sono molto regolari: l'estrattore
   regex copre la massa a costo zero (`metodo='regex'`, auto-approvate perché
   deterministiche). Il residuo ambiguo (citazioni ellittiche) va a un **fan-out
   di subagenti** Claude Code (skill **`/arricchisci-citazioni`**): ogni subagent
   estrae con la propria intelligenza, quindi gira **sotto l'auth della sessione,
   non sulla chiave API tier-1** (niente rate limit da 5 req/min), e atterra
   `approvata=false`. La **verifica (grounding: l'atto è davvero nel testo?) e il
   sign-off sono l'ULTIMO passo della stessa skill** — non una pipeline separata
   che può driftare. *Aggiornamento (stessa sessione): scartata la prima ipotesi
   della Batch API di Anthropic — asincrona e strozzata dal rate limit dell'org
   tier-1 — a favore dei subagenti; sul primo giro di prod la verifica ha
   correttamente approvato 152 citazioni grounded e rigettato 28 di over-reach
   del modello (atti non presenti nel testo). La regola resta quella dell'ADR
   0011: mai un valore a peso legale non verificato che esce da un tool.*

8. **Carve-out esplicito all'[ADR 0003](0003-track-a-stateless-client-local-state.md).**
   ADR 0003 vieta dati fiscali di dominio server-side. Il corpus è compatibile
   perché contiene **esclusivamente fonti pubbliche**: nessun dato di studio o
   di cliente tocca queste tabelle. Il divieto resta pieno per tutto il resto.

## Alternatives considered

- **Indicizzare i manuali operativi** — la fonte con la densità di risposte più
  alta, ed è la ragione per cui l'istinto iniziale era comprarli. Escluso per
  ragioni legali (opt-out TDM, nessun formato distribuibile): ingerire copie
  scansionate sarebbe violazione. Porta riapribile solo con licenza negoziata.
- **Fine-tuning di un modello sul corpus** — il retrieval con citazioni
  verificabili batte il fine-tuning per il grounding: un modello fine-tuned non
  sa dire *dove* ha letto una cosa, e la nostra unità di fiducia è la citazione.
  Inoltre il corpus cambia in continuazione (prassi settimanale).
- **Vector DB dedicato** (Pinecone, Qdrant, Weaviate) — a questa scala è un
  sistema in più da gestire, senza payoff; e perderemmo il filtro sui metadati
  e il full-text italiano nella stessa query.
- **Un unico tool `cerca_fonti(query)`** — costringe il modello a una RAG
  one-shot. Le domande puntuali si risolvono iterando (trova → leggi la sezione
  intera → risali alla norma), che è esattamente ciò che i quattro tool abilitano.
- **`pg` Pool diretto per la ricerca** — scartato: introduce un secondo ciclo di
  vita di connessioni su Vercel. Il Pool resta riservato a Better Auth.

## Consequences

- **Positive:** ogni risposta puntuale può citare "Circolare AdE 24/E del 2023,
  §3.2, p. 14" con URL di origine; l'asse temporale è esplicito, quindi il
  sistema **dice** che non copre il 2026 invece di rispondere dal 2023; il grafo
  citazionale prassi→norma dà a `corpus_norma` un reverse-lookup gratuito; zero
  costi di licenza e zero rischio legale sul corpus; un solo sistema di
  persistenza (Postgres) per billing, telemetria, auth e corpus.
- **Trade-offs / negative:** il pass di arricchimento è un costo LLM una tantum
  per edizione e un debito di sign-off umano ricorrente; i PDF delle istruzioni
  ai modelli sono multi-colonna e ostili (escape hatch documentata: sidecar
  Python/PyMuPDF, solo su macchina dev); la ricerca ibrida ha un parametro
  (`rrf_k`) che nessuno sa tarare senza un golden set — che abbiamo rinviato.
- **Deferred (per decisione esplicita):** **golden set + eval harness** e
  **automazione del refresh** (cron GitHub Actions) non sono in questo giro. Gli
  adapter nascono comunque incrementali e idempotenti e ogni run è loggato, così
  l'eval e il cron si aggiungono dopo senza redesign.
- **Follow-ups:** `corpus_note_redazionali` (lo strato di spiegazione, mostrato
  da `corpus_cerca` solo con `stato='approvata'`); ampliamento del manifest
  Normattiva e backfill prassi più profondo del 2023; le "prossime mosse" del
  brainstorm [`biblioteca-commercialisti.md`](../brainstorms/biblioteca-commercialisti.md)
  sono superate da questo ADR.

## Aggiornamento 2026-07-10 — reranker implementato

Il **reranker Cohere rerank-3.5** (era in follow-up) è stato implementato lo
stesso giorno: `corpus_hybrid_search` restituisce un pool ampio (≈40), che
`src/lib/corpus/rerank.ts` riordina per rilevanza vera query↔passaggio e taglia
al top-N. Con esso, **due interruttori espliciti** (`src/lib/corpus/config.ts`):
`CORPUS_EMBEDDINGS` e `CORPUS_RERANK`, opt-out, default on quando
`COHERE_API_KEY` è presente. Scelta di design: variabili esplicite e non la sola
presenza della chiave, perché la chiave dice "ho le credenziali" non "voglio
questo comportamento" — il reranker è a pagamento sull'hot path e va spegnibile
indipendentemente dagli embedding, e il solo-FTS resta utile per debug/costi.
Entrambe le degradazioni (embedding e rerank) sono dichiarate nell'output
(stesso contratto di `lookupVigente`). La nota sopra — *"la ricerca ibrida ha un
parametro `rrf_k` che nessuno sa tarare senza un golden set"* — resta vera: il
reranker attenua ma non elimina il bisogno di un golden set per la taratura fine.
