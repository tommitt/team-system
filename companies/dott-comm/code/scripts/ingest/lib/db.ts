/**
 * Accesso al DB per gli script di ingestione (ADR 0014).
 *
 * Gli script CLI girano fuori da Next (tsx), quindi NON possono importare
 * `src/lib/billing/supabase.ts` (marcato `server-only`). Stesso client, stessa
 * chiave service-role, ciclo di vita locale allo script.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Fonte = "prassi_ade" | "istruzioni_modelli" | "normattiva";
export type TipoDocumento =
  | "circolare"
  | "risoluzione"
  | "interpello"
  | "istruzioni"
  | "norma";

let client: SupabaseClient | undefined;

export function getDb(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non impostate. " +
          "In locale: `npm run db:start` e usa i valori di `npm run db:status`.",
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Solleva con un messaggio leggibile invece di restituire `{ data: null, error }`. */
export function orThrow<T>(
  res: { data: T | null; error: { message: string } | null },
  contesto: string,
): T {
  if (res.error) throw new Error(`${contesto}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${contesto}: nessun dato restituito`);
  return res.data;
}

// --- Log delle run ---------------------------------------------------------

export type RunLog = {
  id: number;
  visti: number;
  nuovi: number;
  aggiornati: number;
  chunk: number;
};

export async function apriRun(fonte: Fonte): Promise<RunLog> {
  const row = orThrow(
    await getDb()
      .from("corpus_ingestion_runs")
      .insert({ fonte, esito: "in_corso" })
      .select("id")
      .single(),
    "apertura run di ingestione",
  ) as { id: number };
  return { id: row.id, visti: 0, nuovi: 0, aggiornati: 0, chunk: 0 };
}

export async function chiudiRun(
  run: RunLog,
  esito: "ok" | "errore",
  opts: { cursore?: unknown; note?: string } = {},
): Promise<void> {
  const { error } = await getDb()
    .from("corpus_ingestion_runs")
    .update({
      terminata_il: new Date().toISOString(),
      esito,
      documenti_visti: run.visti,
      documenti_nuovi: run.nuovi,
      documenti_aggiornati: run.aggiornati,
      chunk_scritti: run.chunk,
      cursore: opts.cursore ?? null,
      note: opts.note ?? null,
    })
    .eq("id", run.id);
  if (error) console.error(`⚠️ chiusura run fallita: ${error.message}`);
}

/** Cursore incrementale dell'ultima run riuscita per questa fonte (`--incremental`). */
export async function ultimoCursore(
  fonte: Fonte,
): Promise<Record<string, unknown> | null> {
  const { data } = await getDb()
    .from("corpus_ingestion_runs")
    .select("cursore")
    .eq("fonte", fonte)
    .eq("esito", "ok")
    .not("cursore", "is", null)
    .order("iniziata_il", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.cursore as Record<string, unknown> | null) ?? null;
}
