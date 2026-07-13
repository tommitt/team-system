import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatedTool } from "../register-gated-tool";
import { DISCLAIMER_BOZZA } from "@/lib/fiscal/constants";
import {
  CHECKLIST,
  FASI,
  bozzaBoardResolution,
  bozzaProcura,
  valutaStartupInnovativa,
  vociDellaFase,
  type Attore,
  type CriterioInnovazione,
  type VoceCostituzione,
} from "@/lib/fiscal/costituzione-estera";

/**
 * `costituzione_controllata_usa` — la roadmap per costituire una S.r.l. italiana
 * interamente controllata da una società USA (area 05, costituzione di società,
 * variante a socio unico persona giuridica estera). Fa ciò che il generico
 * "Costituzione di società" del problem-space non copre: il layer estero
 * (apostille, traduzioni giurate, codice fiscale per non residenti) e la
 * fiscalità cross-border USA→Italia.
 *
 * Il tool è STATELESS e PURO (ADR 0003): riceve cosa è già disponibile
 * (`documenti_presenti`, derivabili dal client scandendo la cartella dello
 * studio) e restituisce (1) la roadmap ordinata per fasi con le fonti, (2) lo
 * stato ✅/❌ della checklist, (3) la lista di cosa richiedere e a chi, (4) la
 * valutazione di ammissibilità a startup innovativa, (5) le bozze già
 * redigibili. Ogni voce `da_verificare` è esposta nell'output: è una BOZZA, i
 * passaggi notarili e fiscali vanno confermati con notaio e consulente. Lo stato
 * vive in `studio/costituzioni/<societa>.md` (prompt `convenzione_studio_db`).
 */

const ATTORE_LABEL: Record<Attore, string> = {
  studio: "Studio",
  cliente: "Cliente/parent",
  parent_usa: "Parent USA",
  notaio: "Notaio",
  banca: "Banca",
  agenzia_entrate: "Agenzia Entrate",
};

function isPresente(voce: VoceCostituzione, presenti: Set<string>): boolean {
  return (
    presenti.has(voce.chiave.toLowerCase()) ||
    presenti.has(voce.label.toLowerCase())
  );
}

export function registerCostituzioneControllataUsa(server: McpServer) {
  registerGatedTool(
    server,
    "costituzione_controllata_usa",
    "Roadmap e bozze per costituire una S.r.l. italiana interamente controllata da una " +
      "società USA (socio unico persona giuridica estera). Restituisce i passi ordinati per " +
      "fasi (decisioni, documenti dalla parent con apostille+traduzione, codici fiscali, atto " +
      "notarile, adempimenti post, fiscalità cross-border) con le fonti; lo stato della " +
      "checklist rispetto a `documenti_presenti`; cosa richiedere e a chi; la valutazione di " +
      "ammissibilità a startup innovativa; e le bozze già redigibili (board resolution, " +
      "procura). Deriva `documenti_presenti` scandendo la cartella dello studio quando " +
      "possibile. Ogni output è una BOZZA: i passaggi notarili e fiscali vanno confermati con " +
      "notaio e consulente. Stato in `studio/costituzioni/<societa>.md`.",
    {
      denominazione: z
        .string()
        .optional()
        .describe("Denominazione proposta della S.r.l. italiana (per intestazione e bozze)"),
      parent_usa: z
        .string()
        .optional()
        .describe("Denominazione della società capogruppo USA (socio unico)"),
      stato_usa: z
        .string()
        .optional()
        .describe("Stato USA di costituzione della parent (es. Delaware): determina chi appone l'apostille"),
      firmatario: z
        .string()
        .optional()
        .describe("Nome del firmatario che rappresenta la parent, se noto (per le bozze)"),
      conferimento: z
        .enum(["denaro", "natura"])
        .default("denaro")
        .describe("Tipo di conferimento del capitale: 'natura' esclude la via notarile online"),
      documenti_presenti: z
        .array(z.string())
        .default([])
        .describe(
          "Chiavi o etichette delle voci già acquisite/fatte (es. 'certificate_incorporation', 'cf_parent'). Il resto è considerato mancante.",
        ),
      valuta_startup_innovativa: z
        .boolean()
        .default(true)
        .describe("Se valutare l'ammissibilità a startup innovativa (di norma sì, per capire se è percorribile)"),
      startup: z
        .object({
          distribuira_utili: z.boolean().optional().describe("La controllata distribuirà utili al parent? (true = esclusione)"),
          oggetto_innovativo: z.boolean().optional().describe("Oggetto sociale innovativo ad alto valore tecnologico?"),
          e_mpmi: z.boolean().optional().describe("È micro/piccola/media impresa (Racc. 2003/361/CE)?"),
          attivita_prevalente_consulenza: z.boolean().optional().describe("Attività prevalente di agenzia/consulenza? (true = esclusione)"),
          mesi_dalla_costituzione: z.number().optional().describe("Mesi dalla costituzione (tetto 60); 0 se ancora da costituire"),
          da_operazione_straordinaria: z.boolean().optional().describe("Nata da fusione/scissione/cessione d'azienda? (true = esclusione)"),
          criterio_innovazione: z
            .enum(["rs", "personale", "privativa", "nessuno"])
            .optional()
            .describe("Quale criterio di innovazione è soddisfatto: rs (R&S≥15%), personale (1/3 o 2/3), privativa (brevetto/software), nessuno"),
        })
        .optional()
        .describe("Dati per la valutazione startup innovativa; lascia vuoti i campi ignoti (finiscono tra 'da confermare')"),
    },
    async (args) => {
      const presenti = new Set(
        args.documenti_presenti.map((d) => d.trim().toLowerCase()),
      );

      const totali = CHECKLIST.length;
      const fatti = CHECKLIST.filter((v) => isPresente(v, presenti)).length;

      const L: string[] = [];
      L.push(
        `COSTITUZIONE S.r.l. ITALIANA CONTROLLATA DA SOCIETÀ USA — ${args.denominazione ?? "[società]"}` +
          (args.parent_usa ? ` (socio unico: ${args.parent_usa})` : ""),
      );
      L.push(`Avanzamento checklist: ${fatti}/${totali} voci completate.`);
      if (args.conferimento === "natura") {
        L.push(
          "⚠️ Conferimento in NATURA: la costituzione online in videoconferenza non è " +
            "disponibile (solo conferimenti in denaro) → atto notarile in presenza + perizia di stima.",
        );
      }
      L.push("");

      // 1) Roadmap per fasi, con stato e fonti.
      L.push("ROADMAP (in ordine; verificare le voci contrassegnate DA VERIFICARE):");
      for (const fase of FASI) {
        const voci = vociDellaFase(fase.chiave);
        if (voci.length === 0) continue;
        L.push("");
        L.push(fase.titolo);
        for (const v of voci) {
          const done = isPresente(v, presenti);
          const box = done ? "[x]" : "[ ]";
          const flag = v.verifica === "da_verificare" ? " ⚠️ DA VERIFICARE" : "";
          const doc = v.documentoDaApostillare ? " · apostille + traduzione giurata" : "";
          L.push(`  ${box} ${v.label} — a carico: ${ATTORE_LABEL[v.aCarico]}${doc}${flag}`);
          L.push(`      ${v.nota}`);
          L.push(`      Fonte: ${v.fonte}`);
        }
      }
      L.push("");

      // 2) Cosa manca, raggruppato per chi deve procurarlo.
      const mancanti = CHECKLIST.filter((v) => !isPresente(v, presenti));
      if (mancanti.length > 0) {
        L.push("DA RICHIEDERE / DA FARE (cosa manca, a chi chiederlo):");
        for (const attore of Object.keys(ATTORE_LABEL) as Attore[]) {
          const delAttore = mancanti.filter((v) => v.aCarico === attore);
          if (delAttore.length === 0) continue;
          L.push(`• ${ATTORE_LABEL[attore]}:`);
          for (const v of delAttore) {
            const doc = v.documentoDaApostillare ? " (con apostille + traduzione giurata)" : "";
            L.push(`   - ${v.label}${doc}`);
          }
        }
        L.push("");
        L.push(
          "Se lo studio non ha ancora accesso ai documenti della parent USA, chiedi al cliente " +
            "di procurarli: senza i documenti apostillati e tradotti il notaio non può procedere.",
        );
        L.push("");
      }

      // 3) Valutazione startup innovativa.
      if (args.valuta_startup_innovativa) {
        const s = args.startup ?? {};
        const esito = valutaStartupInnovativa({
          distribuiraUtili: s.distribuira_utili,
          oggettoInnovativo: s.oggetto_innovativo,
          eMpmi: s.e_mpmi,
          attivitaPrevalenteConsulenza: s.attivita_prevalente_consulenza,
          mesiDallaCostituzione: s.mesi_dalla_costituzione,
          daOperazioneStraordinaria: s.da_operazione_straordinaria,
          criterioInnovazione: s.criterio_innovazione as CriterioInnovazione | undefined,
        });
        const verdetto =
          esito.ammissibile === true
            ? "AMMISSIBILE (sui dati forniti)"
            : esito.ammissibile === false
              ? "NON ammissibile"
              : "DA VALUTARE (mancano conferme)";
        L.push(`VALUTAZIONE STARTUP INNOVATIVA: ${verdetto}`);
        if (esito.bloccanti.length > 0) {
          L.push("  Esclusioni:");
          for (const b of esito.bloccanti) L.push(`   - ${b}`);
        }
        if (esito.daConfermare.length > 0) {
          L.push("  Da confermare:");
          for (const d of esito.daConfermare) L.push(`   - ${d}`);
        }
        L.push("  Note:");
        for (const n of esito.note) L.push(`   - ${n}`);
        L.push("");
      }

      // 4) Bozze già redigibili.
      L.push("BOZZE GIÀ REDIGIBILI (tracce da far adattare a notaio/legale, poi apostille+traduzione):");
      L.push("");
      for (const r of bozzaBoardResolution({
        parent: args.parent_usa,
        denominazione: args.denominazione,
        statoUsa: args.stato_usa,
        firmatario: args.firmatario,
      }))
        L.push(r);
      L.push("");
      for (const r of bozzaProcura({
        parent: args.parent_usa,
        denominazione: args.denominazione,
        procuratore: undefined,
      }))
        L.push(r);
      L.push("");

      // 5) Persistenza dello stato.
      const slug = (args.denominazione ?? "societa")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      L.push(
        `Aggiorna \`studio/costituzioni/${slug}.md\` con lo stato della pratica ` +
          "(una riga per voce: Voce | Fase | A carico | Stato | Data): segna 'fatto' le voci " +
          "completate, aggiungi le date di richiesta/ricezione dei documenti e il termine dei " +
          "10 giorni per il deposito al Registro Imprese. È l'audit trail della costituzione.",
      );
      L.push("");
      L.push(DISCLAIMER_BOZZA);

      return { content: [{ type: "text", text: L.join("\n") }] };
    },
  );
}
