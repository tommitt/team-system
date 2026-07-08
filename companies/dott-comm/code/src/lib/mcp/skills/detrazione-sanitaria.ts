import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import {
  calcolaDetrazioneSanitarie,
  ETICHETTA_RIGO,
  RIGHI_DETRAZIONE,
  type VoceSpesa,
} from "@/lib/fiscal/detrazioni-sanitarie";
import { euro } from "@/lib/fiscal/money";
import {
  DETRAZIONE_SANITARIE_ALIQUOTA,
  DISCLAIMER_BOZZA,
  FRANCHIGIA_SANITARIE,
  SOGLIA_RATEIZZAZIONE_SANITARIE,
} from "@/lib/fiscal/constants";

/**
 * S13 `detrazione_sanitaria` — il calcolatore della detrazione IRPEF delle
 * spese sanitarie (art. 15 c.1 TUIR). Prende le righe estratte da scontrini e
 * fatture mediche (dal client, seguendo il prompt
 * `metodo_estrazione_spese_sanitarie`) e produce i subtotali per rigo del Quadro
 * E/RP (E1–E5), la stima della detrazione con franchigia e tetti, la coda degli
 * scarti (non detraibili, tracciabilità persa), gli avvisi (rateizzazione,
 * doppi conteggi col Sistema TS) e il "foglio" pronto in CSV da salvare/importare
 * in Excel o Google Sheet. Restituisce una BOZZA: la decisione resta umana. Non
 * fa OCR — l'estrazione da PDF/foto la fa il client.
 */
export function registerDetrazioneSanitaria(server: McpServer) {
  registerGatedTool(
    server,
    "detrazione_sanitaria",
    "Calcola i subtotali per rigo (E1–E5 del Quadro E / RP) e una STIMA della detrazione IRPEF " +
      "19% delle spese sanitarie (art. 15 TUIR) a partire dalle righe estratte da scontrini e " +
      "fatture mediche: applica la franchigia unica di €129,11 sul totale E1+E2, l'obbligo di " +
      "tracciabilità (contanti ammessi solo per farmaci/dispositivi/strutture accreditate SSN), i " +
      "tetti E2/E4, la soglia di rateizzazione, scorpora i rimborsi e tiene E25 come onere " +
      "deducibile a parte (non 19%). Segnala scarti e possibili doppi conteggi col 730 precompilato. Restituisce " +
      "una BOZZA da far verificare al professionista, più il 'foglio' in CSV pronto da salvare o " +
      "importare in Excel/Google Sheet. Le righe le estrae il client seguendo il prompt " +
      "`metodo_estrazione_spese_sanitarie`.",
    {
      cliente: z
        .string()
        .optional()
        .describe("Nome del contribuente, per l'intestazione (facoltativo)"),
      anno: z
        .number()
        .int()
        .optional()
        .describe("Anno d'imposta (es. 2025), per l'intestazione (facoltativo)"),
      voci: z
        .array(
          z.object({
            importo: z.number().describe("Importo pagato, in euro"),
            rigo: z
              .enum(["E1c1", "E1c2", "E2", "E3", "E4", "E5", "E25"])
              .describe(
                "Rigo: E1c2 generiche, E1c1 patologie esenti, E2 familiari non a carico, E3 disabili (SOLO mezzi/ausili/sussidi), E4 veicoli disabili, E5 cane guida, E25 spese mediche generiche/assistenza specifica disabili (DEDUZIONE, non 19%). NB: le visite/prestazioni per un disabile vanno in E1, non E3.",
              ),
            detraibile: z
              .boolean()
              .default(true)
              .describe("false per parafarmaci/integratori/spese estetiche: verranno scartate"),
            tracciabilita_richiesta: z
              .boolean()
              .default(false)
              .describe(
                "true se la spesa richiede pagamento tracciabile; false per farmaci, dispositivi medici e prestazioni di strutture pubbliche/accreditate SSN",
              ),
            pagamento_tracciabile: z
              .boolean()
              .default(true)
              .describe("Pagata con mezzo tracciabile (carta/bonifico/assegno)? Rilevante solo se richiesto"),
            in_precompilata: z
              .boolean()
              .default(false)
              .describe("Risulta già nel 730 precompilato (Sistema TS)?"),
            azione: z
              .enum(["confermata", "aggiunta", "modificata", "eliminata"])
              .optional()
              .describe(
                "Azione rispetto al precompilato; se assente = confermata (se in precompilata) o aggiunta",
              ),
            rimborso: z
              .number()
              .optional()
              .describe("Quota rimborsata (assicurazione/fondo sanitario/datore): scorporata, non detraibile"),
            descrizione: z.string().optional().describe("Natura/descrizione (farmaco, ticket, visita, occhiali…)"),
            data: z.string().optional().describe("Data del documento"),
            numero: z.string().optional().describe("Numero fattura/scontrino"),
            fornitore: z.string().optional().describe("Farmacia/medico/struttura"),
            codice_fiscale: z
              .string()
              .optional()
              .describe("Codice fiscale dell'intestatario riportato sul documento (scontrino parlante)"),
            prova_pagamento: z
              .string()
              .optional()
              .describe("Riferimento della prova di pagamento tracciato (estratto conto, annotazione)"),
            intestatario: z.string().optional().describe("Chi sostiene la spesa (il contribuente)"),
            beneficiario: z
              .string()
              .optional()
              .describe("Per chi è la spesa (paziente): il contribuente o un familiare, con stato a carico — decide E1 vs E2"),
            patologia_esente: z
              .boolean()
              .optional()
              .describe("La spesa riguarda una patologia che dà diritto all'esenzione (giustifica E1 col.1/E2)?"),
            bollo: z
              .number()
              .optional()
              .describe("Imposta di bollo €2 sulla fattura (dovuta se esente IVA e importo > €77,47)"),
            note: z.string().optional().describe("Note libere (es. scontrino sbiadito, AIC mancante)"),
          }),
        )
        .describe("Righe estratte dai documenti, una per spesa"),
      colonne: z
        .array(
          z.enum([
            "data",
            "numero",
            "fornitore",
            "codice_fiscale",
            "descrizione",
            "importo",
            "rimborso",
            "bollo",
            "rigo",
            "detraibile",
            "patologia_esente",
            "tracciabilita_richiesta",
            "pagamento_tracciabile",
            "prova_pagamento",
            "in_precompilata",
            "azione",
            "esito",
            "intestatario",
            "beneficiario",
            "note",
          ]),
        )
        .optional()
        .describe(
          "Schema del foglio: colonne del CSV, nell'ordine voluto. Facoltativo — se assente usa lo schema di default. Lo studio può cambiarlo liberamente (sottoinsieme/ordine qualsiasi delle colonne disponibili).",
        ),
    },
    async (args) => {
      const voci: VoceSpesa[] = args.voci.map((v) => ({
        importo: v.importo,
        rigo: v.rigo,
        detraibile: v.detraibile,
        tracciabilitaRichiesta: v.tracciabilita_richiesta,
        pagamentoTracciabile: v.pagamento_tracciabile,
        inPrecompilata: v.in_precompilata,
        azione: v.azione,
        rimborso: v.rimborso,
        descrizione: v.descrizione,
        data: v.data,
        fornitore: v.fornitore,
        intestatario: v.intestatario,
      }));

      const r = calcolaDetrazioneSanitarie(voci);

      // Esito per voce (stesso ordine dell'input), per il foglio CSV.
      const esitoPerIndice = new Map(r.valutazioni.map((v) => [v.indice, v.esito]));

      const intest = [args.cliente ?? "cliente", args.anno ? `— anno ${args.anno}` : ""]
        .filter(Boolean)
        .join(" ");

      const L: string[] = [];
      L.push(`RIEPILOGO SPESE SANITARIE — ${intest}`);
      L.push(`${voci.length} voci in ingresso · ${r.valutazioni.filter((v) => v.esito === "inclusa").length} incluse`);
      L.push("");

      // --- Assunzioni -----------------------------------------------------
      L.push("Assunzioni (fonte e data di verifica dal registro costanti):");
      L.push(
        `- Detrazione ${Math.round(r.aliquota * 100)}% sull'eccedenza della franchigia di ${euro(r.franchigia)} (${FRANCHIGIA_SANITARIE.fonte}; verificato il ${FRANCHIGIA_SANITARIE.verificatoIl}).`,
      );
      L.push(
        `- Aliquota: ${DETRAZIONE_SANITARIE_ALIQUOTA.fonte}; verificato il ${DETRAZIONE_SANITARIE_ALIQUOTA.verificatoIl}.`,
      );
      L.push(
        "- Le spese sanitarie NON subiscono la riduzione per reddito (art. 15 c.3-bis) né il tetto oneri (art. 16-ter): detraibili al 19% a ogni livello di reddito.",
      );
      L.push("");

      // --- Subtotali per rigo (detrazione 19%) ---------------------------
      L.push("SUBTOTALI PER RIGO (da trascrivere nel Quadro E / RP)");
      for (const rigo of RIGHI_DETRAZIONE) {
        if (r.subtotali[rigo] > 0) {
          L.push(`   ${ETICHETTA_RIGO[rigo]}: ${euro(r.subtotali[rigo])}`);
        }
      }
      L.push(`   → Totale spese detraibili: ${euro(r.totaleIncluso)}`);
      L.push("");

      // --- Stima detrazione ----------------------------------------------
      L.push("STIMA DELLA DETRAZIONE (indicativa — la definitiva la calcola il sostituto sull'imposta capiente)");
      L.push(
        `   Detrazione stimata: ${euro(r.detrazioneStima)} (franchigia ${euro(r.franchigia)} unica sul totale E1+E2)`,
      );
      if (r.rateizzabile && r.quotaAnnua !== undefined) {
        L.push(
          `   Rateizzabile in 4 quote: ${euro(r.quotaAnnua)}/anno (base E1+E2+E3 = ${euro(r.baseRateizzazione)} > ${euro(SOGLIA_RATEIZZAZIONE_SANITARIE.valore)}).`,
        );
      }
      L.push("");

      // --- Oneri deducibili E25 (trattamento separato) -------------------
      if (r.deduzioneE25 > 0) {
        L.push("ONERI DEDUCIBILI — rigo E25 (NON detrazione 19%: riducono il reddito)");
        L.push(
          `   Spese mediche generiche/assistenza specifica disabili: ${euro(r.deduzioneE25)} → rigo E25 (Sez. II).`,
        );
        L.push("");
      }

      // --- Scarti ---------------------------------------------------------
      const scartiTot =
        r.scarti.nonDetraibili.conteggio +
        r.scarti.tracciabilita.conteggio +
        r.scarti.eliminate.conteggio;
      if (scartiTot > 0) {
        L.push("SCARTI (non entrano nel totale — da rivedere)");
        if (r.scarti.nonDetraibili.conteggio > 0) {
          L.push(
            `   Non detraibili: ${r.scarti.nonDetraibili.conteggio} voci, ${euro(r.scarti.nonDetraibili.importo)}`,
          );
        }
        if (r.scarti.tracciabilita.conteggio > 0) {
          L.push(
            `   ⚠️ Tracciabilità mancante (detrazione persa): ${r.scarti.tracciabilita.conteggio} voci, ${euro(r.scarti.tracciabilita.importo)}`,
          );
        }
        if (r.scarti.eliminate.conteggio > 0) {
          L.push(
            `   Eliminate vs precompilato: ${r.scarti.eliminate.conteggio} voci, ${euro(r.scarti.eliminate.importo)}`,
          );
        }
        L.push("");
      }

      // --- Avvisi ---------------------------------------------------------
      if (r.avvisi.length > 0) {
        L.push("AVVISI");
        for (const a of r.avvisi) L.push(`   - ${a}`);
        L.push("");
      }

      // --- Documentazione da conservare ----------------------------------
      L.push(
        `DOCUMENTAZIONE DA CONSERVARE — importo aggiunto/modificato vs precompilato: ${euro(r.totaleDocumentazioneARischio)}`,
      );
      L.push(
        "   È la parte più esposta al controllo formale: conservare i documenti (fino al 31/12 del 5° anno successivo).",
      );
      L.push("");

      // --- Stato client-local --------------------------------------------
      const slug = (args.cliente ?? "cliente")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileStudio = `studio/spese-sanitarie/${slug}-${args.anno ?? "ANNO"}.csv`;
      L.push(
        `Salva il foglio qui sotto in ${fileStudio} (e importalo nel foglio Excel/Google Sheet dello studio). I subtotali per rigo e la detrazione stimata sono quelli calcolati qui sopra.`,
      );
      L.push("");

      // --- Il "foglio" pronto in CSV (schema configurabile) --------------
      const csvEsc = (v: unknown) => {
        const s = v === undefined || v === null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const si = (b: boolean) => (b ? "sì" : "no");

      // Registro delle colonne disponibili: intestazione + come si valorizza da
      // una riga in ingresso. Lo studio sceglie quali e in che ordine via `colonne`.
      const COLONNE: Record<
        string,
        { header: string; get: (v: (typeof args.voci)[number], esito: string) => string }
      > = {
        data: { header: "Data", get: (v) => v.data ?? "" },
        numero: { header: "Numero", get: (v) => v.numero ?? "" },
        fornitore: { header: "Fornitore", get: (v) => v.fornitore ?? "" },
        codice_fiscale: { header: "Codice fiscale", get: (v) => v.codice_fiscale ?? "" },
        descrizione: { header: "Descrizione", get: (v) => v.descrizione ?? "" },
        importo: { header: "Importo", get: (v) => v.importo.toFixed(2) },
        rimborso: { header: "Rimborso", get: (v) => (v.rimborso ?? 0).toFixed(2) },
        bollo: { header: "Bollo", get: (v) => (v.bollo ?? 0).toFixed(2) },
        rigo: { header: "Rigo", get: (v) => v.rigo },
        detraibile: { header: "Detraibile", get: (v) => si(v.detraibile) },
        patologia_esente: { header: "Patologia_esente", get: (v) => si(v.patologia_esente ?? false) },
        tracciabilita_richiesta: { header: "Tracciabilita_richiesta", get: (v) => si(v.tracciabilita_richiesta) },
        pagamento_tracciabile: { header: "Pagamento_tracciabile", get: (v) => si(v.pagamento_tracciabile) },
        prova_pagamento: { header: "Prova_pagamento", get: (v) => v.prova_pagamento ?? "" },
        in_precompilata: { header: "In_precompilata", get: (v) => si(v.in_precompilata) },
        azione: {
          header: "Azione",
          get: (v) => v.azione ?? (v.in_precompilata ? "confermata" : "aggiunta"),
        },
        esito: { header: "Esito", get: (_v, esito) => esito },
        intestatario: { header: "Intestatario", get: (v) => v.intestatario ?? "" },
        beneficiario: { header: "Beneficiario", get: (v) => v.beneficiario ?? "" },
        note: { header: "Note", get: (v) => v.note ?? "" },
      };
      const COLONNE_DEFAULT = [
        "data",
        "fornitore",
        "descrizione",
        "importo",
        "rigo",
        "detraibile",
        "tracciabilita_richiesta",
        "pagamento_tracciabile",
        "in_precompilata",
        "azione",
        "esito",
        "intestatario",
      ];
      const colonne = (args.colonne ?? COLONNE_DEFAULT).filter((c) => c in COLONNE);

      // Riga "footer" (subtotale/stima): etichetta nella colonna descrizione (o la
      // prima testuale), importo nella colonna importo, rigo/esito se presenti.
      const colImporto = colonne.indexOf("importo");
      const colEtichetta = colonne.includes("descrizione")
        ? colonne.indexOf("descrizione")
        : 0;
      const footer = (etichetta: string, importoVal: number, rigo: string, marker: string) => {
        const cells = colonne.map((c) => {
          if (c === "rigo") return rigo;
          if (c === "esito") return marker;
          return "";
        });
        cells[colEtichetta] =
          colImporto === -1 ? `${etichetta} = ${importoVal.toFixed(2)}` : etichetta;
        if (colImporto !== -1) cells[colImporto] = importoVal.toFixed(2);
        return cells.map(csvEsc).join(",");
      };

      L.push("```csv");
      L.push(colonne.map((c) => COLONNE[c].header).join(","));
      for (let i = 0; i < args.voci.length; i++) {
        const esito = esitoPerIndice.get(i) ?? "inclusa";
        L.push(colonne.map((c) => csvEsc(COLONNE[c].get(args.voci[i], esito))).join(","));
      }
      for (const rg of RIGHI_DETRAZIONE) {
        if (r.subtotali[rg] > 0) L.push(footer(`SUBTOTALE ${rg}`, r.subtotali[rg], rg, "subtotale"));
      }
      L.push(footer("DETRAZIONE STIMATA", r.detrazioneStima, "", "stima"));
      if (r.deduzioneE25 > 0) {
        L.push(footer("DEDUZIONE E25 (onere deducibile)", r.deduzioneE25, "E25", "deduzione"));
      }
      L.push("```");
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
