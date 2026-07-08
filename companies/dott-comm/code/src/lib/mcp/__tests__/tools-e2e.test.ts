import { beforeAll, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// Niente Supabase nei test: il percorso ungated (open local dev) non tocca il
// gate; telemetry/feedback ricevono un client fittizio che non viene usato.
vi.mock("@/lib/billing/supabase", () => ({
  getSupabaseAdmin: () => {
    throw new Error("Supabase non deve essere toccato in questo test");
  },
}));

import { registerTools } from "../tools";

/**
 * Smoke end-to-end: registra i tool sul VERO McpServer e li chiama come farebbe
 * un client MCP (InMemoryTransport), verificando schema zod, handler e output.
 * Gira nel percorso open-local-dev (nessun authInfo → gate e telemetria saltati).
 */

let client: Client;

beforeAll(async () => {
  vi.stubEnv("MCP_REQUIRE_AUTH", "");
  vi.stubEnv("MCP_DEV_USER_ID", "");
  const server = new McpServer({ name: "dott-comm-e2e", version: "0.0.0" });
  registerTools(server);
  client = new Client({ name: "e2e", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
});

async function chiama(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as Array<{ type: string; text: string }>;
  expect(result.isError ?? false).toBe(false);
  return content.map((c) => c.text).join("\n");
}

describe("MCP end-to-end", () => {
  it("espone tutte le capability attese", async () => {
    const { tools } = await client.listTools();
    const nomi = tools.map((t) => t.name).sort();
    expect(nomi).toEqual(
      [
        "onboarding",
        "prospetto_acconti",
        "estrai_documenti",
        "ravvedimento",
        "triage_atto",
        "scadenze_cliente",
        "raccolta_documenti",
        "comunica_versamenti",
        "invia_feedback",
      ].sort(),
    );
  });

  it("triage_atto: accertamento con adesione, feriale inclusa", async () => {
    const testo = await chiama("triage_atto", {
      tipo_atto: "avviso_accertamento",
      data_notifica: "2026-07-10",
      cliente: "Rossi SRL",
      con_adesione: true,
    });
    expect(testo).toContain("2026-10-09"); // ricorso 60 gg + feriale
    expect(testo).toContain("2027-01-07"); // +90 gg adesione
    expect(testo).toContain("PERENTORIO");
    expect(testo).toContain("sospensione feriale");
  });

  it("triage_atto: avviso bonario con sanzione ridotta", async () => {
    const testo = await chiama("triage_atto", {
      tipo_atto: "avviso_bonario",
      data_notifica: "2026-07-20",
      importo: 3000,
      sanzione_piena: 750,
    });
    expect(testo).toContain("2026-10-23"); // 60 gg + sospensione estiva bonari
    expect(testo).toContain("250,00 €"); // sanzione ridotta a 1/3
  });

  it("scadenze_cliente: deriva lo scadenzario nel periodo", async () => {
    const testo = await chiama("scadenze_cliente", {
      cliente: "Bianchi SNC",
      regime: "ordinaria",
      forma: "societa_persone",
      sostituto_imposta: true,
      da: "2026-03-01",
      giorni: 60,
    });
    expect(testo).toContain("Certificazione Unica");
    expect(testo).toContain("2026-03-16");
    expect(testo).toContain("studio/scadenzario.md");
  });

  it("raccolta_documenti: campagna con dashboard e bozze mirate", async () => {
    const testo = await chiama("raccolta_documenti", {
      campagna: "dichiarativi 2026",
      clienti: [
        {
          nome: "Verdi",
          tipo_cliente: "forfettario",
          documenti_presenti: [
            "fatture_emesse",
            "incassi",
            "contributi_inps",
            "spese_deducibili",
          ],
        },
        {
          nome: "Neri",
          tipo_cliente: "professionista",
          documenti_presenti: ["fatture_emesse"],
          note_extra: ["fattura ACME di dicembre"],
        },
      ],
    });
    expect(testo).toContain("1 completi ✅ · 1 da sollecitare");
    expect(testo).toContain("| Verdi | forfettario | 4/4 | ✅ completo |");
    expect(testo).toContain("BOZZA SOLLECITO — Neri");
    expect(testo).not.toContain("BOZZA SOLLECITO — Verdi");
    expect(testo).toContain("fattura ACME di dicembre");
    expect(testo).toContain("studio/raccolta/dichiarativi-2026.md");
  });

  it("comunica_versamenti: campagna con riepilogo e bozze per canale", async () => {
    const testo = await chiama("comunica_versamenti", {
      scadenza: "20 luglio 2026",
      versamenti: [
        { cliente: "Verdi", totale: 1234.5, canale: "whatsapp" },
        {
          cliente: "Neri",
          totale: 4000,
          dettaglio: [
            { voce: "Saldo 2025", importo: 2500 },
            { voce: "1ª rata acconto 2026", importo: 1500 },
          ],
          rate: "6 rate fino al 16/12",
        },
      ],
    });
    expect(testo).toContain("2 clienti");
    // NB: il locale it omette il separatore delle migliaia sotto le 5 cifre.
    expect(testo).toContain("5234,50 €"); // totale campagna
    expect(testo).toContain("Ci confermi quando hai pagato?"); // tono whatsapp
    expect(testo).toContain("Saldo 2025: 2500,00 €");
    expect(testo).toContain("studio/versamenti/20-luglio-2026.md");
  });
});
