SET check_function_bodies = false;
CREATE EXTENSION vector WITH SCHEMA public;
CREATE FUNCTION public.corpus_hybrid_search(query_text text, query_embedding public.vector, match_count integer DEFAULT 12, filtro_fonte text DEFAULT NULL::text, filtro_anno integer DEFAULT NULL::integer, rrf_k integer DEFAULT 50)
 RETURNS TABLE(chunk_id bigint, documento_id uuid, fonte text, tipo text, estremi text, titolo text, url_origine text, percorso text, testo text, seq integer, pagina_da integer, pagina_a integer, anno_imposta integer, vigenza_da date, vigenza_a date, nota_redazionale text, score double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
GRANT ALL ON FUNCTION public.corpus_hybrid_search(text, public.vector, integer, text, integer, integer) TO service_role;
CREATE TABLE public.corpus_chunks (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, documento_id uuid NOT NULL, seq integer NOT NULL, percorso text NOT NULL, testo text NOT NULL, pagina_da integer, pagina_a integer, anno_imposta integer, vigenza_da date, vigenza_a date, tsv tsvector GENERATED ALWAYS AS (to_tsvector('italian'::regconfig, ((COALESCE(percorso, ''::text) || ' '::text) || COALESCE(testo, ''::text)))) STORED, embedding public.vector(1024), created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.corpus_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_chunks ADD CONSTRAINT corpus_chunks_documento_id_seq_key UNIQUE (documento_id, seq);
ALTER TABLE public.corpus_chunks ADD CONSTRAINT corpus_chunks_pkey PRIMARY KEY (id);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_chunks TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_chunks TO authenticated;
GRANT ALL ON public.corpus_chunks TO service_role;
CREATE INDEX corpus_chunks_anno_idx ON public.corpus_chunks (anno_imposta);
CREATE INDEX corpus_chunks_tsv_idx ON public.corpus_chunks USING gin (tsv);
CREATE INDEX corpus_chunks_embedding_idx ON public.corpus_chunks USING hnsw (embedding public.vector_cosine_ops);
CREATE INDEX corpus_chunks_documento_seq_idx ON public.corpus_chunks (documento_id, seq);
CREATE TABLE public.corpus_citazioni (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, chunk_id bigint NOT NULL, riferimento text NOT NULL, urn text, documento_citato_id uuid, testo_grezzo text, metodo text NOT NULL, approvata boolean DEFAULT false NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.corpus_citazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_citazioni ADD CONSTRAINT corpus_citazioni_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.corpus_chunks(id) ON DELETE CASCADE;
ALTER TABLE public.corpus_citazioni ADD CONSTRAINT corpus_citazioni_metodo_check CHECK (metodo = ANY (ARRAY['regex'::text, 'llm'::text]));
ALTER TABLE public.corpus_citazioni ADD CONSTRAINT corpus_citazioni_pkey PRIMARY KEY (id);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_citazioni TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_citazioni TO authenticated;
GRANT ALL ON public.corpus_citazioni TO service_role;
CREATE INDEX corpus_citazioni_pending_idx ON public.corpus_citazioni (approvata) WHERE NOT approvata;
CREATE INDEX corpus_citazioni_documento_citato_idx ON public.corpus_citazioni (documento_citato_id);
CREATE INDEX corpus_citazioni_riferimento_idx ON public.corpus_citazioni (riferimento);
CREATE INDEX corpus_citazioni_chunk_idx ON public.corpus_citazioni (chunk_id);
CREATE TABLE public.corpus_documenti (id uuid DEFAULT gen_random_uuid() NOT NULL, fonte text NOT NULL, tipo text NOT NULL, estremi text NOT NULL, titolo text, identificativo text NOT NULL, url_origine text NOT NULL, data_pubblicazione date, anno_imposta integer, vigenza_da date, vigenza_a date, hash_contenuto text NOT NULL, verificato_il date, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.corpus_documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_documenti ADD CONSTRAINT corpus_documenti_fonte_check CHECK (fonte = ANY (ARRAY['prassi_ade'::text, 'istruzioni_modelli'::text, 'normattiva'::text]));
ALTER TABLE public.corpus_documenti ADD CONSTRAINT corpus_documenti_identificativo_key UNIQUE (identificativo);
ALTER TABLE public.corpus_documenti ADD CONSTRAINT corpus_documenti_pkey PRIMARY KEY (id);
ALTER TABLE public.corpus_chunks ADD CONSTRAINT corpus_chunks_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.corpus_documenti(id) ON DELETE CASCADE;
ALTER TABLE public.corpus_citazioni ADD CONSTRAINT corpus_citazioni_documento_citato_id_fkey FOREIGN KEY (documento_citato_id) REFERENCES public.corpus_documenti(id) ON DELETE SET NULL;
ALTER TABLE public.corpus_documenti ADD CONSTRAINT corpus_documenti_tipo_check CHECK (tipo = ANY (ARRAY['circolare'::text, 'risoluzione'::text, 'interpello'::text, 'istruzioni'::text, 'norma'::text]));
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_documenti TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_documenti TO authenticated;
GRANT ALL ON public.corpus_documenti TO service_role;
CREATE INDEX corpus_documenti_fonte_idx ON public.corpus_documenti (fonte);
CREATE INDEX corpus_documenti_anno_idx ON public.corpus_documenti (anno_imposta);
CREATE INDEX corpus_documenti_pubblicazione_idx ON public.corpus_documenti (data_pubblicazione DESC);
CREATE TABLE public.corpus_ingestion_runs (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, fonte text NOT NULL, iniziata_il timestamp with time zone DEFAULT now() NOT NULL, terminata_il timestamp with time zone, esito text DEFAULT 'in_corso'::text NOT NULL, documenti_visti integer DEFAULT 0 NOT NULL, documenti_nuovi integer DEFAULT 0 NOT NULL, documenti_aggiornati integer DEFAULT 0 NOT NULL, chunk_scritti integer DEFAULT 0 NOT NULL, cursore jsonb, note text);
ALTER TABLE public.corpus_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_ingestion_runs ADD CONSTRAINT corpus_ingestion_runs_esito_check CHECK (esito = ANY (ARRAY['in_corso'::text, 'ok'::text, 'errore'::text]));
ALTER TABLE public.corpus_ingestion_runs ADD CONSTRAINT corpus_ingestion_runs_fonte_check CHECK (fonte = ANY (ARRAY['prassi_ade'::text, 'istruzioni_modelli'::text, 'normattiva'::text]));
ALTER TABLE public.corpus_ingestion_runs ADD CONSTRAINT corpus_ingestion_runs_pkey PRIMARY KEY (id);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_ingestion_runs TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_ingestion_runs TO authenticated;
GRANT ALL ON public.corpus_ingestion_runs TO service_role;
CREATE INDEX corpus_ingestion_runs_fonte_idx ON public.corpus_ingestion_runs (fonte, iniziata_il DESC);
CREATE TABLE public.corpus_note_redazionali (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, chunk_id bigint NOT NULL, testo text NOT NULL, stato text DEFAULT 'bozza'::text NOT NULL, modello text, created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.corpus_note_redazionali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_note_redazionali ADD CONSTRAINT corpus_note_redazionali_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.corpus_chunks(id) ON DELETE CASCADE;
ALTER TABLE public.corpus_note_redazionali ADD CONSTRAINT corpus_note_redazionali_chunk_id_key UNIQUE (chunk_id);
ALTER TABLE public.corpus_note_redazionali ADD CONSTRAINT corpus_note_redazionali_pkey PRIMARY KEY (id);
ALTER TABLE public.corpus_note_redazionali ADD CONSTRAINT corpus_note_redazionali_stato_check CHECK (stato = ANY (ARRAY['bozza'::text, 'approvata'::text]));
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_note_redazionali TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.corpus_note_redazionali TO authenticated;
GRANT ALL ON public.corpus_note_redazionali TO service_role;
CREATE INDEX corpus_note_redazionali_approvate_idx ON public.corpus_note_redazionali (chunk_id) WHERE stato = 'approvata'::text;

-- Aggiunto a mano: `supabase db diff` (pg-delta) non emette le REVOKE sui
-- privilegi di funzione, e in Postgres EXECUTE è concesso a PUBLIC per default.
-- Senza questo, `corpus_hybrid_search` — che è SECURITY DEFINER e legge tabelle
-- con RLS attiva — sarebbe chiamabile da `anon` come RPC PostgREST.
-- La stessa REVOKE vive in supabase/schemas/04_corpus.sql (source of truth).
REVOKE EXECUTE ON FUNCTION public.corpus_hybrid_search(text, public.vector, integer, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.corpus_hybrid_search(text, public.vector, integer, text, integer, integer) TO service_role;
