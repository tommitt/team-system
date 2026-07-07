import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProspettoAcconti } from "./skills/prospetto-acconti";
import { registerEstraiDocumenti } from "./skills/estrai-documenti";
import { registerRavvedimento } from "./skills/ravvedimento";
import { registerRaccoltaDocumenti } from "./loops/raccolta-documenti";
import { registerComunicaVersamenti } from "./loops/comunica-versamenti";
import { registerPrompts } from "./prompts";
import { registerFeedback } from "./feedback";

/**
 * Registers Dott. Comm.'s MCP capabilities on the given server.
 *
 * This is the thin composer: each capability lives in its own module under
 * `skills/` (procedure codificate) and `loops/` (cicli di relazione col cliente,
 * area 09), and registers through the billing gate (`register-gated-tool.ts`,
 * ADR 0002). Prompts (the "metodo + template" delle skill) are registered
 * ungated in `prompts.ts`. See `content/brainstorms/catalogo-skills-tools.md`.
 *
 * Track A — il cuneo del 20 luglio 2026 (D.L. 89/2026): la catena
 * L1 `raccolta_documenti` → S7 `estrai_documenti` → S12 `prospetto_acconti`
 * → L2 `comunica_versamenti`, più S9 `ravvedimento` per i "can't-pay".
 * I dati di dominio (clienti, stato raccolta, conferme) restano nei file dello
 * studio, gestiti dal client (Claude Code): il server non li persiste.
 */
export function registerTools(server: McpServer) {
  // Skills (procedure codificate)
  registerProspettoAcconti(server); // S12 — il calcolatore del versamento
  registerEstraiDocumenti(server); // S7  — normalizza/valida i dati estratti
  registerRavvedimento(server); // S9  — versamenti tardivi

  // Loops (area 09 — il fossato)
  registerRaccoltaDocumenti(server); // L1 — il sollecito
  registerComunicaVersamenti(server); // L2 — comunicazione versamenti

  // Prompts (metodo + template, non gated)
  registerPrompts(server);

  // Feedback (ADR 0006, non gated — deve funzionare anche oltre il paywall)
  registerFeedback(server);
}
