-- Corpus di fonti ufficiali + retrieval ibrido (ADR 0014).
--
-- Declarative end-state (see 01_billing.sql for the workflow: edit this file,
-- then `npm run db:diff -- -f <name>` + `npm run db:push`). Never hand-write a
-- migration (ADR 0007).
--
-- CARVE-OUT esplicito all'ADR 0003 ("nessun dato fiscale server-side"): queste
-- tabelle contengono ESCLUSIVAMENTE fonti pubbliche (prassi AdE, istruzioni ai
-- modelli, Normattiva). Nessun dato di studio o di cliente entra qui. Il divieto
-- dell'ADR 0003 resta pieno per tutto il resto.
--
-- Il principio di design: la conoscenza del commercialista non è testo piatto,
-- è una GERARCHIA CITAZIONALE con un ASSE TEMPORALE. Provenienza (`identificativo`,
-- `url_origine`, `pagina_da/a`, `percorso`), citazioni normative strutturate
-- (`corpus_citazioni` → grafo prassi→norma) e validità temporale (`anno_imposta`,
-- `vigenza_da/a`) sono metadati di PRIMA CLASSE, non commenti. Stesso contratto
-- di `lookupVigente` (ADR 0011): mai un default stantio silenzioso.

create extension if not exists vector;

-- --- Documenti -------------------------------------------------------------
-- Un documento = una circolare, una risoluzione, un interpello, un fascicolo di
-- istruzioni, un atto normativo. `identificativo` è la CHIAVE NATURALE su cui
-- poggia l'idempotenza degli adapter (URN Normattiva, `ade:circolare:2023:24E`,
-- `istr:redditi-pf:2026:fasc1`); `hash_contenuto` (sha256 del raw scaricato)
-- decide se ri-processare: stesso hash → skip, hash diverso → delete+reinsert.

create table public.corpus_documenti (
  id                 uuid primary key default gen_random_uuid(),
  fonte              text not null check (fonte in ('prassi_ade', 'istruzioni_modelli', 'normattiva')),
  tipo               text not null check (tipo in ('circolare', 'risoluzione', 'interpello', 'istruzioni', 'norma')),
  -- Estremi citabili in chiaro: "Circolare 24/E del 26/07/2023", "DPR 917/1986".
  estremi            text not null,
  titolo             text,
  identificativo     text not null unique,
  url_origine        text not null,
  data_pubblicazione date,
  -- Anno d'imposta a cui il documento si riferisce, quando è determinato
  -- (istruzioni ai modelli: anno del modello − 1). NULL = non vincolato.
  anno_imposta       integer,
  -- Vigenza del testo (Normattiva: multivigenza). Estremo NULL = aperto.
  vigenza_da         date,
  vigenza_a          date,
  hash_contenuto     text not null,
  -- Ultima verifica su fonte viva (registry pattern, ADR 0011).
  verificato_il      date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index corpus_documenti_fonte_idx on public.corpus_documenti (fonte);
create index corpus_documenti_anno_idx on public.corpus_documenti (anno_imposta);
create index corpus_documenti_pubblicazione_idx on public.corpus_documenti (data_pubblicazione desc);

-- --- Chunk -----------------------------------------------------------------
-- Il chunk è l'unità di RICERCA; la sezione è l'unità di LETTURA (`corpus_leggi`
-- ricompone i vicini per `seq`). `percorso` è la gerarchia completa
-- ("DPR 917/1986 > Titolo I > Art. 51 — Redditi di lavoro dipendente"): è il
-- metadato più prezioso, per questo entra sia nel tsvector sia nell'embedding
-- (contextual retrieval — si embedda `percorso || '\n' || testo`).

create table public.corpus_chunks (
  id           bigint generated always as identity primary key,
  documento_id uuid not null references public.corpus_documenti (id) on delete cascade,
  -- Ordine dentro il documento: dà i vicini per l'espansione di contesto.
  seq          integer not null,
  percorso     text not null,
  testo        text not null,
  pagina_da    integer,
  pagina_a     integer,
  anno_imposta integer,
  vigenza_da   date,
  vigenza_a    date,
  tsv          tsvector generated always as (
                 to_tsvector('italian', coalesce(percorso, '') || ' ' || coalesce(testo, ''))
               ) stored,
  -- Cohere embed-v4, output_dimension 1024, distanza coseno.
  embedding    vector(1024),
  created_at   timestamptz not null default now(),
  unique (documento_id, seq)
);

create index corpus_chunks_tsv_idx on public.corpus_chunks using gin (tsv);
create index corpus_chunks_embedding_idx on public.corpus_chunks
  using hnsw (embedding vector_cosine_ops);
create index corpus_chunks_documento_seq_idx on public.corpus_chunks (documento_id, seq);
create index corpus_chunks_anno_idx on public.corpus_chunks (anno_imposta);

-- --- Citazioni (il grafo prassi → norma) -----------------------------------
-- Estratte regex-first (deterministiche → `approvata` true di default a monte,
-- vedi lo script) e LLM per il residuo ambiguo (`approvata=false` finché la
-- skill /verifica-fonti non porta il pending al sign-off umano).
-- `documento_citato_id` è NULL finché la norma citata non è a sua volta ingerita:
-- il grafo si chiude progressivamente, e un buco non è un errore.

create table public.corpus_citazioni (
  id                  bigint generated always as identity primary key,
  chunk_id            bigint not null references public.corpus_chunks (id) on delete cascade,
  -- Forma normalizzata e confrontabile: "DPR 917/1986, art. 51, c. 2".
  riferimento         text not null,
  urn                 text,
  documento_citato_id uuid references public.corpus_documenti (id) on delete set null,
  -- Il testo così com'era nel chunk ("art. 51, comma 2, del Tuir").
  testo_grezzo        text,
  metodo              text not null check (metodo in ('regex', 'llm')),
  approvata           boolean not null default false,
  created_at          timestamptz not null default now()
);

create index corpus_citazioni_chunk_idx on public.corpus_citazioni (chunk_id);
create index corpus_citazioni_riferimento_idx on public.corpus_citazioni (riferimento);
create index corpus_citazioni_documento_citato_idx on public.corpus_citazioni (documento_citato_id);
create index corpus_citazioni_pending_idx on public.corpus_citazioni (approvata) where not approvata;

-- --- Log delle run di ingestione -------------------------------------------
-- Una riga per run di ogni adapter. `cursore` porta lo stato incrementale
-- (es. `{"ultimo_anno": 2026, "ultima_data": "2026-07-01"}`) così `--incremental`
-- riparte da dove si era fermato. È anche la base della copertura mostrata
-- da `corpus_indice` e del footer di `corpus_cerca`.

create table public.corpus_ingestion_runs (
  id                bigint generated always as identity primary key,
  fonte             text not null check (fonte in ('prassi_ade', 'istruzioni_modelli', 'normattiva')),
  iniziata_il       timestamptz not null default now(),
  terminata_il      timestamptz,
  esito             text not null default 'in_corso' check (esito in ('in_corso', 'ok', 'errore')),
  documenti_visti   integer not null default 0,
  documenti_nuovi   integer not null default 0,
  documenti_aggiornati integer not null default 0,
  chunk_scritti     integer not null default 0,
  cursore           jsonb,
  note              text
);

create index corpus_ingestion_runs_fonte_idx on public.corpus_ingestion_runs (fonte, iniziata_il desc);

-- --- Note redazionali (lo strato di spiegazione, ADR 0014 §7) --------------
-- Il "livello Memento" che generiamo noi: una nota per chunk, prodotta dal pass
-- di arricchimento LLM. `corpus_cerca` la mostra SOLO con `stato='approvata'`
-- (sign-off umano via /verifica-fonti): mai testo generato spacciato per fonte.

create table public.corpus_note_redazionali (
  id         bigint generated always as identity primary key,
  chunk_id   bigint not null references public.corpus_chunks (id) on delete cascade,
  testo      text not null,
  stato      text not null default 'bozza' check (stato in ('bozza', 'approvata')),
  modello    text,
  created_at timestamptz not null default now(),
  unique (chunk_id)
);

create index corpus_note_redazionali_approvate_idx on public.corpus_note_redazionali (chunk_id)
  where stato = 'approvata';

-- --- RLS + grants ----------------------------------------------------------
-- Casa: RLS abilitata, ZERO policy, grant espliciti al solo service_role (che
-- bypassa RLS ma ha comunque bisogno del grant su tabelle create via CLI —
-- stessa ragione di users_billing in 01_billing.sql).

alter table public.corpus_documenti enable row level security;
alter table public.corpus_chunks enable row level security;
alter table public.corpus_citazioni enable row level security;
alter table public.corpus_ingestion_runs enable row level security;
alter table public.corpus_note_redazionali enable row level security;

grant select, insert, update, delete on table public.corpus_documenti to service_role;
grant select, insert, update, delete on table public.corpus_chunks to service_role;
grant select, insert, update, delete on table public.corpus_citazioni to service_role;
grant select, insert, update, delete on table public.corpus_ingestion_runs to service_role;
grant select, insert, update, delete on table public.corpus_note_redazionali to service_role;

-- --- Ricerca ibrida: FTS italiano + kNN coseno, fusi con RRF ---------------
-- Reciprocal Rank Fusion: score = Σ 1/(k + rank) su ciascuna lista. Robusto
-- perché fonde RANGHI, non punteggi (BM25 e distanza coseno non sono
-- commensurabili). `rrf_k` smorza il peso delle prime posizioni: più è alto,
-- più conta l'accordo tra le due liste che il primato in una sola.
--
-- FULL OUTER JOIN perché un chunk può comparire in una lista sola: la parola
-- esatta ("ravvedimento") la trova la FTS, la parafrasi la trova il vettore.
-- Perdere l'uno o l'altro è esattamente il fallimento che l'ibrido evita.

create or replace function public.corpus_hybrid_search(
  query_text      text,
  query_embedding vector(1024),
  match_count     integer default 12,
  filtro_fonte    text default null,
  filtro_anno     integer default null,
  rrf_k           integer default 50
)
returns table (
  chunk_id       bigint,
  documento_id   uuid,
  fonte          text,
  tipo           text,
  estremi        text,
  titolo         text,
  url_origine    text,
  percorso       text,
  testo          text,
  seq            integer,
  pagina_da      integer,
  pagina_a       integer,
  anno_imposta   integer,
  vigenza_da     date,
  vigenza_a      date,
  nota_redazionale text,
  score          double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Il filtro sui metadati si applica PRIMA della fusione, dentro ciascun ramo:
  -- filtrare dopo restringerebbe le top-60 già scelte e svuoterebbe i risultati.
  candidati as (
    select c.id, c.documento_id
    from public.corpus_chunks c
    join public.corpus_documenti d on d.id = c.documento_id
    where (filtro_fonte is null or d.fonte = filtro_fonte)
      and (
        filtro_anno is null
        or c.anno_imposta = filtro_anno
        or d.anno_imposta = filtro_anno
        -- Nessun anno dichiarato (es. norma multivigente): non escludere,
        -- lascia decidere alla vigenza e all'avviso temporale a valle.
        or (c.anno_imposta is null and d.anno_imposta is null)
      )
  ),
  fts as (
    select c.id as chunk_id,
           row_number() over (
             order by ts_rank_cd(c.tsv, websearch_to_tsquery('italian', query_text)) desc, c.id
           ) as rank
    from public.corpus_chunks c
    join candidati k on k.id = c.id
    where query_text is not null
      and c.tsv @@ websearch_to_tsquery('italian', query_text)
    order by rank
    limit 60
  ),
  knn as (
    select c.id as chunk_id,
           row_number() over (order by c.embedding <=> query_embedding, c.id) as rank
    from public.corpus_chunks c
    join candidati k on k.id = c.id
    where query_embedding is not null
      and c.embedding is not null
    order by rank
    limit 60
  ),
  fusi as (
    select coalesce(fts.chunk_id, knn.chunk_id) as chunk_id,
           coalesce(1.0 / (rrf_k + fts.rank), 0.0)
         + coalesce(1.0 / (rrf_k + knn.rank), 0.0) as score
    from fts
    full outer join knn on fts.chunk_id = knn.chunk_id
  )
  select c.id,
         d.id,
         d.fonte,
         d.tipo,
         d.estremi,
         d.titolo,
         d.url_origine,
         c.percorso,
         c.testo,
         c.seq,
         c.pagina_da,
         c.pagina_a,
         coalesce(c.anno_imposta, d.anno_imposta),
         coalesce(c.vigenza_da, d.vigenza_da),
         coalesce(c.vigenza_a, d.vigenza_a),
         n.testo,
         f.score
  from fusi f
  join public.corpus_chunks c on c.id = f.chunk_id
  join public.corpus_documenti d on d.id = c.documento_id
  -- Solo note APPROVATE: una nota in bozza non esce mai da un tool.
  left join public.corpus_note_redazionali n
         on n.chunk_id = c.id and n.stato = 'approvata'
  order by f.score desc, c.id
  limit match_count;
$$;

-- La funzione è `security definer` (legge tabelle con RLS attiva e zero policy):
-- va quindi tolta a chiunque non sia il service-role, altrimenti PostgREST la
-- esporrebbe ad `anon`.
revoke execute on function public.corpus_hybrid_search(text, vector, integer, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.corpus_hybrid_search(text, vector, integer, text, integer, integer)
  to service_role;
