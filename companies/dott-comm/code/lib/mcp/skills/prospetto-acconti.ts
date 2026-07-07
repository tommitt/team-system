import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { calcolaAcconto, valutaPrevisionale } from "@/lib/fiscal/acconti";
import { pianoRate } from "@/lib/fiscal/rateazione";
import { codiceF24, codiceInteressiRateizzo } from "@/lib/fiscal/f24-codici";
import { euro, roundEuro } from "@/lib/fiscal/money";
import {
  DISCLAIMER_BOZZA,
  MAGGIORAZIONE_DIFFERIMENTO,
  SCADENZA_SALDO_ACCONTO,
  SCADENZA_SALDO_ACCONTO_MAGGIORATA,
} from "@/lib/fiscal/constants";

/**
 * S12 `prospetto_acconti` — il calcolatore del versamento del 20/7/2026
 * (D.L. 89/2026). Compone il rules engine puro di `lib/fiscal/` nel one-pager
 * bozza per il cliente: saldo + 1° acconto, alternativa 20/8 +0,80%, metodo
 * storico vs previsionale con riga di rischio, piano rate con codici F24.
 * La decisione (storico vs previsionale, adeguamento ISA) resta umana.
 */
export function registerProspettoAcconti(server: McpServer) {
  registerGatedTool(
    server,
    "prospetto_acconti",
    "Calcola il prospetto del versamento del 20/7/2026 (saldo 2025 + 1° acconto 2026, " +
      "D.L. 89/2026) per un cliente: totale, alternativa al 20/8 con +0,80%, split storico " +
      "(40/60 ordinari, 50/50 ISA/forfettari), opzione previsionale con la riga di rischio " +
      "(tolleranza/sanzione) e piano di rateizzazione con codici F24. Restituisce una BOZZA " +
      "da far verificare al professionista: la decisione resta umana. I numeri in input vanno " +
      "estratti dal dichiarativo/gestionale (usa `estrai_documenti`).",
    {
      cliente: z
        .string()
        .optional()
        .describe("Nome del cliente per l'intestazione (facoltativo)"),
      regime: z
        .enum(["ordinario", "isa", "forfettario", "vantaggio"])
        .describe(
          "Regime del contribuente: determina lo split dell'acconto (ISA/forfettari 50/50, ordinari 40/60)",
        ),
      tributo: z
        .enum(["irpef", "forfettario", "cedolare", "irap", "iva"])
        .default("irpef")
        .describe("Tributo principale, per i codici F24"),
      saldo: z
        .number()
        .describe("Imposta a saldo 2025, in euro (dal rigo saldo del dichiarativo)"),
      acconto_base: z
        .number()
        .describe(
          "Base dell'acconto col metodo storico: rigo differenza (RN34 per le PF), in euro",
        ),
      metodo: z
        .enum(["storico", "previsionale"])
        .default("storico")
        .describe("Metodo di calcolo dell'acconto"),
      acconto_previsionale: z
        .number()
        .optional()
        .describe("Solo se metodo=previsionale: acconto totale che si intende versare"),
      imposta_finale_stimata: z
        .number()
        .optional()
        .describe(
          "Solo se metodo=previsionale: imposta 2026 stimata, per la riga di rischio",
        ),
      finestra: z
        .enum(["20_luglio", "20_agosto"])
        .default("20_luglio")
        .describe("Finestra di pagamento; 20/8 applica la maggiorazione dello 0,80%"),
      n_rate: z
        .number()
        .int()
        .min(1)
        .max(7)
        .default(1)
        .describe("Numero di rate (1 = pagamento in unica soluzione)"),
    },
    async (args) => {
      const acc = calcolaAcconto({
        base: args.acconto_base,
        regime: args.regime,
      });

      // Quota di acconto dovuta alla scadenza del saldo (0 se unica soluzione a nov.).
      const primaRataAcconto =
        acc.modalita === "due_rate" ? (acc.prima?.importo ?? 0) : 0;
      const dovutoScadenza = roundEuro(args.saldo + primaRataAcconto);
      const dovutoMaggiorato = roundEuro(
        dovutoScadenza * (1 + MAGGIORAZIONE_DIFFERIMENTO),
      );
      const paga20Agosto = args.finestra === "20_agosto";
      const importoDaVersare = paga20Agosto ? dovutoMaggiorato : dovutoScadenza;
      const dataVersamento = paga20Agosto
        ? SCADENZA_SALDO_ACCONTO_MAGGIORATA
        : SCADENZA_SALDO_ACCONTO;

      const L: string[] = [];
      L.push(
        `PROSPETTO VERSAMENTI — ${args.cliente ?? "cliente"} (regime ${args.regime})`,
      );
      L.push("");

      // --- Assunzioni -----------------------------------------------------
      L.push("Assunzioni (DA VERIFICARE):");
      L.push(
        `- Acconto metodo storico = 100% del rigo differenza; split ${acc.split === "-" ? "n/d" : acc.split}.`,
      );
      L.push(
        "- Scadenza 20/7/2026 senza maggiorazione (proroga D.L. 89/2026); 20/8/2026 con +0,80%.",
      );
      L.push("");

      // --- Saldo + 1° acconto --------------------------------------------
      L.push("1) SALDO 2025 + 1ª RATA ACCONTO 2026");
      L.push(`   Saldo 2025:            ${euro(args.saldo)}  [F24 ${codiceF24(args.tributo, "saldo") ?? "n/d"}]`);
      if (acc.modalita === "due_rate") {
        L.push(
          `   1ª rata acconto (${Math.round((acc.prima?.quota ?? 0) * 100)}%): ${euro(primaRataAcconto)}  [F24 ${codiceF24(args.tributo, "acconto_prima") ?? "n/d"}]`,
        );
      } else if (acc.modalita === "unica_soluzione") {
        L.push(
          `   Acconto: unica soluzione da versare entro il 30/11/2026 (${euro(acc.totale)}), nulla alla scadenza del saldo.`,
        );
      } else {
        L.push("   Acconto non dovuto (sotto la soglia di legge).");
      }
      L.push(`   → Dovuto al ${dataVersamento}: ${euro(importoDaVersare)}`);
      if (!paga20Agosto) {
        L.push(
          `   → In alternativa al 20/8/2026 (+0,80%): ${euro(dovutoMaggiorato)}`,
        );
      }
      L.push("");

      // --- 2ª rata acconto ------------------------------------------------
      if (acc.seconda) {
        L.push(
          `2) 2ª RATA ACCONTO — ${euro(acc.seconda.importo)} entro il 30/11/2026  [F24 ${codiceF24(args.tributo, "acconto_seconda") ?? "n/d"}]`,
        );
        L.push("");
      }

      // --- Storico vs previsionale ---------------------------------------
      if (args.metodo === "previsionale") {
        if (
          args.acconto_previsionale === undefined ||
          args.imposta_finale_stimata === undefined
        ) {
          L.push(
            "3) METODO PREVISIONALE — mancano `acconto_previsionale` e/o `imposta_finale_stimata`: impossibile valutare la riga di rischio.",
          );
        } else {
          const prev = valutaPrevisionale({
            accontoStorico: acc.totale,
            accontoPrevisionale: args.acconto_previsionale,
            impostaFinaleStimata: args.imposta_finale_stimata,
          });
          L.push("3) METODO PREVISIONALE — RIGA DI RISCHIO");
          L.push(`   Acconto storico:        ${euro(prev.accontoStorico)}`);
          L.push(`   Acconto previsionale:   ${euro(prev.accontoPrevisionale)}`);
          L.push(`   Risparmio immediato:    ${euro(prev.risparmioVsStorico)}`);
          L.push(
            `   Soglia di sicurezza:    ${euro(prev.sogliaRischio)} (stima ${euro(prev.impostaFinaleStimata)} × ${Math.round((1 - prev.tolleranza) * 100)}%)`,
          );
          if (prev.aRischio) {
            L.push(
              `   ⚠️ A RISCHIO: sotto la soglia. Se l'imposta finale sarà pari alla stima, scoperto ~${euro(prev.scopertoStimato)} → sanzione potenziale ~${euro(prev.sanzionePotenziale)} + interessi.`,
            );
          } else {
            L.push(
              `   ✅ Sopra la soglia di rischio; scoperto potenziale ~${euro(prev.scopertoStimato)} se l'imposta finale sarà pari alla stima.`,
            );
          }
        }
        L.push("");
      }

      // --- Piano rate -----------------------------------------------------
      if (args.n_rate > 1) {
        const piano = pianoRate({
          importoTotale: importoDaVersare,
          nRate: args.n_rate,
          dataPrimaRata: dataVersamento,
        });
        const codInt = codiceInteressiRateizzo(args.tributo);
        L.push(
          `4) PIANO RATE — ${piano.nRateEffettive} rate${piano.capato ? ` (richieste ${piano.nRateRichieste}, ridotte per rispettare il 16/12)` : ""}, interessi ~4% annuo  [F24 interessi ${codInt}]`,
        );
        for (const r of piano.rate) {
          L.push(
            `   Rata ${r.numero}/${piano.nRateEffettive} — ${r.scadenza}: ${euro(r.importo)} (capitale ${euro(r.quotaCapitale)} + interessi ${euro(r.interessi)})`,
          );
        }
        L.push(
          `   Totale interessi: ${euro(piano.totaleInteressi)} — totale con interessi: ${euro(piano.totaleConInteressi)}`,
        );
        L.push("");
      }

      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
