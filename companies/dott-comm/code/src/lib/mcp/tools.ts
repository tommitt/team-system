import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOnboarding } from "./skills/onboarding";
import { registerProspettoAcconti } from "./skills/prospetto-acconti";
import { registerEstraiDocumenti } from "./skills/estrai-documenti";
import { registerDetrazioneSanitaria } from "./skills/detrazione-sanitaria";
import { registerRavvedimento } from "./skills/ravvedimento";
import { registerTriageAtto } from "./skills/triage-atto";
import { registerScadenzeCliente } from "./skills/scadenze-cliente";
import { registerCostituzioneControllataUsa } from "./skills/costituzione-controllata-usa";
import { registerValutaIngressoItalia } from "./skills/valuta-ingresso-italia";
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
  // Onboarding — il primo strumento che il prompt del sito fa chiamare: avvia
  // l'intervista sulle priorità del 20 luglio e instrada verso il tool giusto.
  registerOnboarding(server);

  // Skills (procedure codificate)
  registerProspettoAcconti(server); // S12 — il calcolatore del versamento
  registerEstraiDocumenti(server); // S7  — normalizza/valida i dati estratti
  registerDetrazioneSanitaria(server); // S13 — detrazione spese sanitarie (scontrini)
  registerRavvedimento(server); // S9  — versamenti tardivi
  registerTriageAtto(server); // S2/W1 paste-in — termini perentori degli atti
  registerScadenzeCliente(server); // T1 client-local — derivazione scadenzario
  registerValutaIngressoItalia(server); // S15 — advisor ingresso USA→Italia (area 04/05)
  registerCostituzioneControllataUsa(server); // S14 — S.r.l. USA-owned (area 05)

  // Loops (area 09 — il fossato), in forma campagna sul portafoglio
  registerRaccoltaDocumenti(server); // L1 — il sollecito
  registerComunicaVersamenti(server); // L2 — comunicazione versamenti

  // Prompts (metodo + template, non gated)
  registerPrompts(server);

  // Feedback (ADR 0006, non gated — deve funzionare anche oltre il paywall)
  registerFeedback(server);
}
