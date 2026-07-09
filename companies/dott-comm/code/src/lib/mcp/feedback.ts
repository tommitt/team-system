import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseAdmin } from "@/lib/billing/supabase";
import { resolveUserId } from "./register-gated-tool";
import { recordToolEvent } from "./telemetry";

/**
 * `invia_feedback` (ADR 0006) — the explicit half of the feedback pipeline.
 * The model, present in every session, is our feedback collector: the tool
 * description below + the server `instructions` (route.ts) tell it to propose
 * filing feedback whenever the user hits a missing capability or friction.
 *
 * Registered UNGATED (direct `server.tool`, the one exception to
 * `registerGatedTool`): feedback is not a billable capability, and it must
 * keep working when the paywall blocks a user — churn reasons are the most
 * valuable feedback we get. It still records its own telemetry event.
 */

const GRAZIE =
  "Grazie! Il feedback è stato registrato e alimenterà le priorità di sviluppo di Dott. Comm.";

const RIPROVA =
  "Non sono riuscito a registrare il feedback per un problema temporaneo. Riprova tra qualche istante.";

export function registerFeedback(server: McpServer) {
  server.tool(
    "invia_feedback",
    "Invia un feedback al team di Dott. Comm. USALO PROATTIVAMENTE: quando l'utente chiede " +
      "qualcosa che questi strumenti non sanno fare (capability_mancante), vorrebbe un risultato " +
      "diverso da quello prodotto (comportamento_diverso), o incontra attrito/frustrazione nel " +
      "flusso (frizione) — proponi all'utente di segnalarlo e chiama questo tool solo dopo il suo " +
      "consenso. NON includere mai dati fiscali dei clienti dello studio (nomi, importi, codici " +
      "fiscali, partite IVA) in `messaggio` o `contesto`: descrivi il bisogno in termini generali.",
    {
      categoria: z
        .enum(["capability_mancante", "comportamento_diverso", "frizione", "altro"])
        .describe("Tipo di feedback"),
      messaggio: z
        .string()
        .min(1)
        .describe("Il feedback, con le parole dell'utente (senza dati dei clienti)"),
      contesto: z
        .string()
        .optional()
        .describe(
          "Cosa stava cercando di fare l'utente e quale tool era coinvolto, se rilevante",
        ),
    },
    async ({ categoria, messaggio, contesto }, extra) => {
      const userId = resolveUserId(extra) ?? "anonimo";
      const start = Date.now();
      let ok = true;
      try {
        const { error } = await getSupabaseAdmin().from("feedback").insert({
          user_id: userId,
          categoria,
          messaggio,
          contesto: contesto ?? null,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Feedback insert failed:", err);
        ok = false;
      }
      await recordToolEvent({
        userId,
        tool: "invia_feedback",
        sessionId: extra.sessionId,
        outcome: ok ? "ok" : "error",
        latencyMs: Date.now() - start,
        argsKeys: contesto === undefined ? ["categoria", "messaggio"] : ["categoria", "messaggio", "contesto"],
      });
      return { content: [{ type: "text" as const, text: ok ? GRAZIE : RIPROVA }] };
    },
  );
}
