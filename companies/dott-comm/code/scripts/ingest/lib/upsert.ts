/**
 * Il contratto di idempotenza degli adapter (ADR 0014 §6).
 *
 *   stesso `identificativo` + stesso `hash_contenuto`  → skip (niente da fare)
 *   `identificativo` nuovo                             → insert documento + chunk
 *   `hash_contenuto` cambiato                          → delete + reinsert chunk,
 *                                                        bump `verificato_il`
 *
 * Rieseguire un adapter dev'essere un no-op: è ciò che rende sicuro il refresh
 * manuale e, domani, quello automatico. I chunk vecchi si cancellano invece di
 * aggiornarsi perché il ri-chunking può cambiare il numero di pezzi: un update
 * per `seq` lascerebbe orfani in coda (e citazioni appese a testo che non esiste
 * più — la cascade se le porta via).
 */
import type { Fonte, TipoDocumento } from "./db";
import { getDb, orThrow, type RunLog } from "./db";
import type { Chunk } from "./chunker";
import { estraiCitazioni } from "./citazioni";

export type DocumentoDaIngerire = {
  fonte: Fonte;
  tipo: TipoDocumento;
  estremi: string;
  titolo?: string;
  identificativo: string;
  urlOrigine: string;
  dataPubblicazione?: string;
  annoImposta?: number;
  vigenzaDa?: string;
  vigenzaA?: string;
  hashContenuto: string;
};

export type EsitoUpsert = "skip" | "nuovo" | "aggiornato";

/** Chunk insert list max: PostgREST regge molto di più, ma i payload restano leggibili. */
const LOTTO = 200;

export async function upsertDocumento(
  doc: DocumentoDaIngerire,
  chunks: Chunk[],
  run: RunLog,
  opts: { dryRun?: boolean } = {},
): Promise<EsitoUpsert> {
  const db = getDb();
  run.visti++;

  const { data: esistente, error } = await db
    .from("corpus_documenti")
    .select("id, hash_contenuto")
    .eq("identificativo", doc.identificativo)
    .maybeSingle();
  if (error) throw new Error(`lettura documento: ${error.message}`);

  if (esistente && esistente.hash_contenuto === doc.hashContenuto) {
    return "skip";
  }

  if (opts.dryRun) {
    console.log(
      `  [dry-run] ${esistente ? "aggiornerei" : "inserirei"} ${doc.identificativo} — ${chunks.length} chunk`,
    );
    for (const c of chunks.slice(0, 3)) {
      console.log(`    · ${c.percorso}`);
      console.log(`      ${c.testo.slice(0, 160).replace(/\n/g, " ")}…`);
    }
    return esistente ? "aggiornato" : "nuovo";
  }

  const oggi = new Date().toISOString().slice(0, 10);
  const riga = {
    fonte: doc.fonte,
    tipo: doc.tipo,
    estremi: doc.estremi,
    titolo: doc.titolo ?? null,
    identificativo: doc.identificativo,
    url_origine: doc.urlOrigine,
    data_pubblicazione: doc.dataPubblicazione ?? null,
    anno_imposta: doc.annoImposta ?? null,
    vigenza_da: doc.vigenzaDa ?? null,
    vigenza_a: doc.vigenzaA ?? null,
    hash_contenuto: doc.hashContenuto,
    verificato_il: oggi,
    updated_at: new Date().toISOString(),
  };

  let documentoId: string;
  let esito: EsitoUpsert;

  if (esistente) {
    orThrow(
      await db
        .from("corpus_documenti")
        .update(riga)
        .eq("id", esistente.id)
        .select("id")
        .single(),
      `update documento ${doc.identificativo}`,
    );
    // La cascade su corpus_chunks porta via citazioni e note del testo superato.
    const { error: delErr } = await db
      .from("corpus_chunks")
      .delete()
      .eq("documento_id", esistente.id);
    if (delErr) throw new Error(`delete chunk: ${delErr.message}`);
    documentoId = esistente.id;
    esito = "aggiornato";
    run.aggiornati++;
  } else {
    const inserito = orThrow(
      await db.from("corpus_documenti").insert(riga).select("id").single(),
      `insert documento ${doc.identificativo}`,
    ) as { id: string };
    documentoId = inserito.id;
    esito = "nuovo";
    run.nuovi++;
  }

  await scriviChunks(documentoId, doc, chunks, run);
  return esito;
}

async function scriviChunks(
  documentoId: string,
  doc: DocumentoDaIngerire,
  chunks: Chunk[],
  run: RunLog,
): Promise<void> {
  const db = getDb();

  for (let i = 0; i < chunks.length; i += LOTTO) {
    const lotto = chunks.slice(i, i + LOTTO);
    const righe = lotto.map((c) => ({
      documento_id: documentoId,
      seq: c.seq,
      percorso: c.percorso,
      testo: c.testo,
      pagina_da: c.paginaDa ?? null,
      pagina_a: c.paginaA ?? null,
      anno_imposta: doc.annoImposta ?? null,
      vigenza_da: doc.vigenzaDa ?? null,
      vigenza_a: doc.vigenzaA ?? null,
    }));

    // `embedding` resta NULL: lo riempie `embed-missing.ts`, disaccoppiato dal
    // parsing (l'API Cohere non deve poter far fallire un'ingestione).
    const inseriti = orThrow(
      await db.from("corpus_chunks").insert(righe).select("id, testo"),
      "insert chunk",
    ) as { id: number; testo: string }[];
    run.chunk += inseriti.length;

    const citazioni = inseriti.flatMap((c) =>
      estraiCitazioni(c.testo).map((cit) => ({
        chunk_id: c.id,
        riferimento: cit.riferimento,
        urn: cit.urn,
        testo_grezzo: cit.testoGrezzo,
        metodo: cit.metodo,
        // Deterministiche: non c'è niente da approvare a mano.
        approvata: true,
      })),
    );
    if (citazioni.length > 0) {
      const { error } = await db.from("corpus_citazioni").insert(citazioni);
      if (error) throw new Error(`insert citazioni: ${error.message}`);
    }
  }
}

/**
 * Chiude gli archi del grafo citazionale che ora possono chiudersi: una citazione
 * "DPR 917/1986, art. 51" punta al documento Normattiva del TUIR appena questo
 * entra nel corpus. Si rilancia dopo ogni ingestione di norme — è idempotente.
 */
export async function collegaCitazioniAiDocumenti(): Promise<number> {
  const db = getDb();
  const norme = orThrow(
    await db
      .from("corpus_documenti")
      .select("id, estremi")
      .eq("fonte", "normattiva"),
    "lettura norme",
  ) as { id: string; estremi: string }[];

  let collegate = 0;
  for (const norma of norme) {
    // `estremi` delle norme è la forma canonica "DPR 917/1986": le citazioni
    // iniziano con essa ("DPR 917/1986, art. 51, c. 2").
    const { data, error } = await db
      .from("corpus_citazioni")
      .update({ documento_citato_id: norma.id })
      .is("documento_citato_id", null)
      .like("riferimento", `${norma.estremi}%`)
      .select("id");
    if (error) throw new Error(`collegamento citazioni: ${error.message}`);
    collegate += data?.length ?? 0;
  }
  return collegate;
}
