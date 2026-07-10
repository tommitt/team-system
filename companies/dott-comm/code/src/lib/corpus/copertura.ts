import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Fonte } from "./search";

/**
 * Copertura temporale del corpus (ADR 0014 §2).
 *
 * Il punto: quando arriva una domanda sull'anno d'imposta 2026 e la nostra
 * fonte più recente è del 2025, il sistema deve DIRLO, non rispondere in
 * silenzio con il testo vecchio. È la differenza fra un giocattolo e uno
 * strumento di cui un professionista si fida — e ricalca il contratto di
 * `lookupVigente` del registro costanti (`verificato:false` + `nota`, ADR 0011).
 */

export type CoperturaFonte = {
  fonte: Fonte;
  documenti: number;
  /** Anno d'imposta più recente coperto (null per le norme multivigenti). */
  annoMax: number | null;
  /** Documento più recente per data di pubblicazione. */
  ultimaPubblicazione: string | null;
  ultimaIngestione: string | null;
};

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

export async function copertura(): Promise<CoperturaFonte[]> {
  const { data: documenti, error } = await db()
    .from("corpus_documenti")
    .select("fonte, anno_imposta, data_pubblicazione");
  if (error) throw new Error(`copertura: ${error.message}`);

  const { data: runs } = await db()
    .from("corpus_ingestion_runs")
    .select("fonte, terminata_il")
    .eq("esito", "ok")
    .order("terminata_il", { ascending: false });

  const perFonte = new Map<Fonte, CoperturaFonte>();
  for (const d of documenti ?? []) {
    const fonte = d.fonte as Fonte;
    const corrente = perFonte.get(fonte) ?? {
      fonte,
      documenti: 0,
      annoMax: null,
      ultimaPubblicazione: null,
      ultimaIngestione: null,
    };
    corrente.documenti++;
    if (d.anno_imposta !== null) {
      corrente.annoMax = Math.max(corrente.annoMax ?? 0, d.anno_imposta);
    }
    if (
      d.data_pubblicazione &&
      (!corrente.ultimaPubblicazione || d.data_pubblicazione > corrente.ultimaPubblicazione)
    ) {
      corrente.ultimaPubblicazione = d.data_pubblicazione;
    }
    perFonte.set(fonte, corrente);
  }

  for (const [fonte, c] of perFonte) {
    c.ultimaIngestione =
      (runs ?? []).find((r) => r.fonte === fonte)?.terminata_il ?? null;
  }
  return [...perFonte.values()];
}

/**
 * L'anno d'imposta più alto che il corpus copre davvero, considerando sia
 * l'`anno_imposta` dichiarato sia l'anno della prassi più recente (una circolare
 * del 2026 parla del 2026 anche senza un `anno_imposta` in colonna).
 */
export function annoMassimoCoperto(coperture: CoperturaFonte[]): number | null {
  const anni = coperture.flatMap((c) => [
    c.annoMax,
    c.ultimaPubblicazione ? Number(c.ultimaPubblicazione.slice(0, 4)) : null,
  ]);
  const validi = anni.filter((a): a is number => a !== null);
  return validi.length > 0 ? Math.max(...validi) : null;
}
