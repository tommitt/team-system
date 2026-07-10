/**
 * Client minimale per la Message Batches API di Anthropic (ADR 0014 §7).
 *
 * Via `fetch`: nessun SDK da installare per tre endpoint. La Batch API costa il
 * −50% ed è asincrona (≤24h, di solito ≪1h), che è esattamente il profilo di un
 * pass di arricchimento una tantum. I risultati arrivano in ORDINE QUALSIASI:
 * si indicizza sempre per `custom_id`, mai per posizione.
 *
 * Modello configurabile per pass (ADR 0014): default `claude-haiku-4-5`,
 * `claude-sonnet-5` per i volumi complessi (citazioni ellittiche, note
 * redazionali). Structured output forzato con un tool `strict`.
 */

const BASE = "https://api.anthropic.com/v1/messages/batches";
const VERSION = "2023-06-01";

export type ModelloEnrichment = "claude-haiku-4-5" | "claude-sonnet-5";

export function chiaveAnthropic(): string {
  const chiave = process.env.ANTHROPIC_API_KEY;
  if (!chiave) {
    throw new Error(
      "ANTHROPIC_API_KEY non impostata: il pass di arricchimento LLM non può girare. " +
        "È usata SOLO dagli script, mai dall'app.",
    );
  }
  return chiave;
}

function headers(): Record<string, string> {
  return {
    "x-api-key": chiaveAnthropic(),
    "anthropic-version": VERSION,
    "content-type": "application/json",
  };
}

/**
 * fetch con retry sui 429. Il rate limit dell'org Anthropic è basso (5 req/min
 * sui tier bassi), quindi ogni chiamata — create, retrieve, results — lo può
 * toccare. Su 429 si rispetta l'header `retry-after` (o si aspetta il minuto) e
 * si riprova, senza consumare un tentativo. Errori non-429 falliscono subito.
 */
const MAX_ATTESE_RATE_LIMIT = 20;

async function fetchConRetry(
  url: string,
  init: RequestInit,
  contesto: string,
): Promise<Response> {
  let attese = 0;
  for (;;) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    if (attese >= MAX_ATTESE_RATE_LIMIT) {
      throw new Error(`${contesto}: 429 persistente dopo ${attese} attese`);
    }
    attese++;
    const retryAfter = Number(res.headers.get("retry-after"));
    const attesaMs = Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 1) * 1000 : 30_000;
    console.warn(
      `  ⏳ ${contesto}: rate limit — attendo ${Math.round(attesaMs / 1000)}s (${attese}/${MAX_ATTESE_RATE_LIMIT})`,
    );
    await new Promise((r) => setTimeout(r, attesaMs));
  }
}

export type RichiestaBatch = {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    system?: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[];
    tools: unknown[];
    tool_choice: unknown;
    messages: { role: "user"; content: string }[];
  };
};

export async function creaBatch(richieste: RichiestaBatch[]): Promise<string> {
  const res = await fetchConRetry(
    BASE,
    { method: "POST", headers: headers(), body: JSON.stringify({ requests: richieste }) },
    "batches.create",
  );
  if (!res.ok) {
    throw new Error(`batches.create ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function statoBatch(
  id: string,
): Promise<{ processing_status: string; results_url: string | null }> {
  const res = await fetchConRetry(`${BASE}/${id}`, { headers: headers() }, "batches.retrieve");
  if (!res.ok) {
    throw new Error(`batches.retrieve ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as { processing_status: string; results_url: string | null };
}

export type RisultatoBatch = {
  custom_id: string;
  result:
    | { type: "succeeded"; message: { content: { type: string; input?: unknown }[] } }
    | { type: "errored"; error: unknown }
    | { type: "canceled" }
    | { type: "expired" };
};

/** Scarica i risultati (JSONL) e li restituisce come array — sono in ordine qualsiasi. */
export async function risultatiBatch(resultsUrl: string): Promise<RisultatoBatch[]> {
  const res = await fetchConRetry(resultsUrl, { headers: headers() }, "batches.results");
  if (!res.ok) {
    throw new Error(`batches.results ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const testo = await res.text();
  return testo
    .split("\n")
    .filter((r) => r.trim() !== "")
    .map((r) => JSON.parse(r) as RisultatoBatch);
}

/** Poll finché il batch non è `ended`, con un intervallo prudente. */
export async function attendiBatch(
  id: string,
  onTick?: (stato: string) => void,
): Promise<string> {
  const INTERVALLO = 30_000; // 2 poll/min: sotto il limite org di 5 req/min
  for (;;) {
    const { processing_status, results_url } = await statoBatch(id);
    onTick?.(processing_status);
    if (processing_status === "ended") {
      if (!results_url) throw new Error("batch ended ma results_url assente");
      return results_url;
    }
    await new Promise((r) => setTimeout(r, INTERVALLO));
  }
}
