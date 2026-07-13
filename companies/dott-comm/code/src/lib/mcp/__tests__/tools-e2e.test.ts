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
        "detrazione_sanitaria",
        "ravvedimento",
        "triage_atto",
        "scadenze_cliente",
        "valuta_ingresso_italia",
        "costituzione_controllata_usa",
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

  it("detrazione_sanitaria: subtotali per rigo, franchigia, scarti e studio-db", async () => {
    const testo = await chiama("detrazione_sanitaria", {
      cliente: "Mario Rossi",
      anno: 2025,
      voci: [
        { importo: 500, rigo: "E1c2", descrizione: "farmaci" },
        {
          importo: 40,
          rigo: "E1c2",
          detraibile: false,
          descrizione: "integratore",
        },
        {
          importo: 200,
          rigo: "E1c2",
          tracciabilita_richiesta: true,
          pagamento_tracciabile: false,
          descrizione: "visita privata in contanti",
        },
      ],
    });
    expect(testo).toContain("E1 col. 2");
    // 19% × (500 − 129,11) = 70,4691 → 70,47 €
    expect(testo).toContain("70,47 €");
    expect(testo).toContain("Tracciabilità mancante");
    expect(testo).toContain("Non detraibili");
    expect(testo).toContain("studio/spese-sanitarie/mario-rossi-2025.csv");
    expect(testo).toContain("```csv"); // il foglio pronto da salvare/importare
    expect(testo).toContain("DETRAZIONE STIMATA");
    expect(testo).toContain("BOZZA");
  });

  it("detrazione_sanitaria: schema del foglio configurabile via `colonne`", async () => {
    const testo = await chiama("detrazione_sanitaria", {
      cliente: "Rossi",
      anno: 2025,
      colonne: ["data", "descrizione", "importo", "rigo", "codice_fiscale", "note"],
      voci: [
        {
          importo: 300,
          rigo: "E1c2",
          data: "2025-04-01",
          descrizione: "occhiali da vista",
          codice_fiscale: "RSSMRA80A01H501U",
          note: "dispositivo medico CE",
        },
      ],
    });
    // Intestazione del CSV nell'ordine richiesto, con le colonne scelte e non altre.
    expect(testo).toContain("Data,Descrizione,Importo,Rigo,Codice fiscale,Note");
    expect(testo).not.toContain("Tracciabilita_richiesta"); // colonna non richiesta
    expect(testo).toContain("RSSMRA80A01H501U");
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

  it("valuta_ingresso_italia: sole vendite senza PE → posizione IVA (rappr. fiscale)", async () => {
    const testo = await chiama("valuta_ingresso_italia", {
      cliente: "Acme Inc.",
      obiettivo: "vendere il nostro software in Italia",
      attivita: "solo_vendite",
      presenza_fisica: "nessuna",
      assumera_personale: false,
      residenza_founder: "usa",
    });
    expect(testo).toContain("OPZIONE CONSIGLIATA: Posizione IVA (rappresentante fiscale)");
    expect(testo).toContain("non può fare identificazione diretta");
    expect(testo).toContain("RISPOSTE ALLE DOMANDE CHIAVE");
    expect(testo).toContain("PIANO DI PARTENZA");
    expect(testo).toContain("PROPOSTA DI INCARICO");
    expect(testo).toContain("studio/ingresso/acme-inc.md");
    expect(testo).toContain("BOZZA");
  });

  it("valuta_ingresso_italia: operazioni stabili con assunzioni → S.r.l. e instrada alla roadmap", async () => {
    const testo = await chiama("valuta_ingresso_italia", {
      cliente: "Beta LLC",
      attivita: "operazioni",
      presenza_fisica: "ufficio",
      assumera_personale: true,
      distribuira_utili: true,
      residenza_founder: "usa",
      orizzonte: "stabile",
    });
    expect(testo).toContain("OPZIONE CONSIGLIATA: S.r.l.");
    expect(testo).toContain("5%"); // ritenuta dividendi
    expect(testo).toContain("costituzione_controllata_usa");
  });

  it("valuta_ingresso_italia: founder in Italia → bandiera esterovestizione", async () => {
    const testo = await chiama("valuta_ingresso_italia", {
      cliente: "Gamma Corp",
      attivita: "operazioni",
      residenza_founder: "italia",
    });
    expect(testo).toContain("esterovestizione");
    expect(testo).toContain("art. 73");
  });

  it("costituzione_controllata_usa: roadmap, stato, cosa manca, startup, bozze", async () => {
    const testo = await chiama("costituzione_controllata_usa", {
      denominazione: "Acme Italia",
      parent_usa: "Acme Inc.",
      stato_usa: "Delaware",
      documenti_presenti: ["certificate_incorporation", "cf_parent"],
      startup: {
        distribuira_utili: true, // esclusione tipica della controllata USA
        oggetto_innovativo: true,
      },
    });
    // Roadmap con fasi e stato della checklist.
    expect(testo).toContain("FASE A — Documenti dalla capogruppo USA");
    expect(testo).toContain("[x] Certificate of Incorporation della parent USA");
    expect(testo).toContain("apostille + traduzione giurata");
    // Correzioni verificate: 10 giorni, 100% capitale, S.r.l.s. esclusa.
    expect(testo).toContain("entro 10 GIORNI");
    expect(testo).toContain("PER INTERO (100%)");
    expect(testo).toContain("S.r.l.s.");
    // Cosa manca, raggruppato per attore (board resolution non presente).
    expect(testo).toContain("DA RICHIEDERE");
    expect(testo).toContain("Board resolution");
    // Startup: il divieto di distribuzione utili esclude.
    expect(testo).toContain("VALUTAZIONE STARTUP INNOVATIVA: NON ammissibile");
    expect(testo).toContain("Divieto assoluto di distribuzione di utili");
    // Bozze e persistenza.
    expect(testo).toContain("BOARD RESOLUTION");
    expect(testo).toContain("studio/costituzioni/acme-italia.md");
    expect(testo).toContain("BOZZA");
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
