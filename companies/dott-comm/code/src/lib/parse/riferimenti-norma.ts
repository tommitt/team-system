/**
 * Riconoscimento e normalizzazione dei riferimenti normativi italiani (ADR 0014).
 *
 * È il perno del grafo citazionale: la prassi cita la norma in mille modi
 * ("art. 51 TUIR", "articolo 51, comma 2, del D.P.R. 22 dicembre 1986, n. 917",
 * "l'art. 51 del Testo unico"), e tutte queste stringhe devono collassare sulla
 * stessa forma canonica — `DPR 917/1986, art. 51, c. 2` — altrimenti
 * `corpus_norma` non trova nulla.
 *
 * Funzioni pure e testabili. Il consumatore lato ingestione è
 * `scripts/ingest/lib/citazioni.ts` (estrattore regex-first); il consumatore
 * lato tool è `corpus_norma`.
 */

export type Atto = {
  /** Sigla canonica: "DPR", "D.Lgs.", "L.", "D.L.". */
  sigla: string;
  numero: number;
  anno: number;
  /** Data del provvedimento (serve a comporre l'URN Normattiva). */
  data: string; // YYYY-MM-DD
  /** Nome esteso, per gli estremi leggibili. */
  nome: string;
  /** Componente `urn:nir:stato:<tipo>`. */
  urnTipo: string;
  /** Alias con cui la prassi lo chiama (lowercase, senza punteggiatura). */
  alias: string[];
};

/**
 * Gli atti che il corpus v0 conosce per nome. L'elenco cresce col manifest
 * Normattiva: un atto qui dentro è un atto che sappiamo citare canonicamente,
 * non necessariamente uno che abbiamo ingerito (il grafo tollera i buchi).
 */
export const ATTI: readonly Atto[] = [
  {
    sigla: "DPR",
    numero: 917,
    anno: 1986,
    data: "1986-12-22",
    nome: "Testo unico delle imposte sui redditi",
    urnTipo: "decreto.del.presidente.della.repubblica",
    alias: ["tuir", "testo unico delle imposte sui redditi", "testo unico"],
  },
  {
    sigla: "DPR",
    numero: 633,
    anno: 1972,
    data: "1972-10-26",
    nome: "Istituzione e disciplina dell'imposta sul valore aggiunto",
    urnTipo: "decreto.del.presidente.della.repubblica",
    alias: ["decreto iva", "decreto iva 633"],
  },
  {
    sigla: "DPR",
    numero: 600,
    anno: 1973,
    data: "1973-09-29",
    nome: "Disposizioni comuni in materia di accertamento delle imposte sui redditi",
    urnTipo: "decreto.del.presidente.della.repubblica",
    alias: [],
  },
  {
    sigla: "DPR",
    numero: 435,
    anno: 2001,
    data: "2001-12-07",
    nome: "Semplificazione degli adempimenti dichiarativi",
    urnTipo: "decreto.del.presidente.della.repubblica",
    alias: [],
  },
  {
    sigla: "D.Lgs.",
    numero: 546,
    anno: 1992,
    data: "1992-12-31",
    nome: "Disposizioni sul processo tributario",
    urnTipo: "decreto.legislativo",
    alias: ["processo tributario"],
  },
  {
    sigla: "D.Lgs.",
    numero: 471,
    anno: 1997,
    data: "1997-12-18",
    nome: "Sanzioni tributarie non penali in materia di imposte dirette e IVA",
    urnTipo: "decreto.legislativo",
    alias: [],
  },
  {
    sigla: "D.Lgs.",
    numero: 472,
    anno: 1997,
    data: "1997-12-18",
    nome: "Disposizioni generali in materia di sanzioni amministrative tributarie",
    urnTipo: "decreto.legislativo",
    alias: [],
  },
  {
    sigla: "D.Lgs.",
    numero: 241,
    anno: 1997,
    data: "1997-07-09",
    nome: "Norme di semplificazione degli adempimenti dei contribuenti",
    urnTipo: "decreto.legislativo",
    alias: [],
  },
  {
    sigla: "L.",
    numero: 212,
    anno: 2000,
    data: "2000-07-27",
    nome: "Statuto dei diritti del contribuente",
    urnTipo: "legge",
    alias: ["statuto del contribuente", "statuto dei diritti del contribuente"],
  },
] as const;

const SUFFISSI = "bis|ter|quater|quinquies|sexies|septies|octies|novies|decies";

/** "51-bis", "6 bis", "6bis" → "51-bis" / "6-bis". */
function normalizzaNumeroArticolo(grezzo: string): string {
  const m = grezzo
    .toLowerCase()
    .match(new RegExp(`^(\\d+)\\s*-?\\s*(${SUFFISSI})?$`));
  if (!m) return grezzo.trim();
  return m[2] ? `${m[1]}-${m[2]}` : m[1];
}

const MESI: Record<string, string> = {
  gennaio: "01",
  febbraio: "02",
  marzo: "03",
  aprile: "04",
  maggio: "05",
  giugno: "06",
  luglio: "07",
  agosto: "08",
  settembre: "09",
  ottobre: "10",
  novembre: "11",
  dicembre: "12",
};

/** Normalizza la sigla scritta in tutti i modi possibili ("d.p.r.", "DPR", "dpr"). */
function siglaCanonica(grezzo: string): string | null {
  const s = grezzo.toLowerCase().replace(/[.\s]/g, "");
  if (s === "dpr" || s === "decretodelpresidentedellarepubblica") return "DPR";
  if (s === "dlgs" || s === "dlg" || s === "decretolegislativo") return "D.Lgs.";
  if (s === "dl" || s === "decretolegge") return "D.L.";
  if (s === "l" || s === "legge") return "L.";
  return null;
}

/** Cerca un atto noto per sigla+numero+anno. */
export function attoPerEstremi(
  sigla: string,
  numero: number,
  anno: number,
): Atto | null {
  return (
    ATTI.find(
      (a) => a.sigla === sigla && a.numero === numero && a.anno === anno,
    ) ?? null
  );
}

/** Cerca un atto noto per alias ("tuir", "statuto del contribuente"). */
export function attoPerAlias(testo: string): Atto | null {
  const s = testo.toLowerCase().replace(/[.,]/g, "").trim();
  return ATTI.find((a) => a.alias.includes(s)) ?? null;
}

export type Riferimento = {
  /** Forma canonica: "DPR 917/1986, art. 51, c. 2". */
  riferimento: string;
  urn: string | null;
  sigla: string;
  numero: number;
  anno: number;
  articolo: string | null;
  comma: string | null;
};

/** Chiave d'articolo, senza comma: la granularità del reverse-lookup. */
export function chiaveArticolo(r: {
  sigla: string;
  numero: number;
  anno: number;
  articolo: string | null;
}): string {
  const base = `${r.sigla} ${r.numero}/${r.anno}`;
  return r.articolo ? `${base}, art. ${r.articolo}` : base;
}

export function formattaRiferimento(r: {
  sigla: string;
  numero: number;
  anno: number;
  articolo: string | null;
  comma: string | null;
}): string {
  const base = chiaveArticolo(r);
  return r.comma ? `${base}, c. ${r.comma}` : base;
}

/**
 * URN Normattiva dell'atto (con `~artNN` quando l'articolo è noto). Solo per gli
 * atti del registro: inventare un URN per un atto sconosciuto produrrebbe un
 * link rotto, che è peggio di nessun link.
 */
export function urnDi(atto: Atto, articolo: string | null): string {
  const base = `urn:nir:stato:${atto.urnTipo}:${atto.data};${atto.numero}`;
  return articolo ? `${base}~art${articolo.replace("-", "")}` : base;
}

// Sigla + numero + anno, nelle due forme che la prassi usa davvero:
//   "DPR 633/1972" | "DPR 633/72" | "D.P.R. n. 633 del 1972"
// L'anno abbreviato è ammesso solo dopo la barra: "n. 633 del 72" non si scrive.
const RE_ATTO_COMPATTO =
  /\b(d\.?p\.?r\.?|d\.?lgs\.?|d\.?lg\.?|d\.?l\.?|legge|l\.)\s*(?:n\.?\s*)?(\d{1,4})\s*(?:\/\s*((?:19|20)?\d{2})|\s+del\s+((?:19|20)\d{2}))\b/gi;
const RE_ATTO_ESTESO = new RegExp(
  String.raw`\b(d\.?p\.?r\.?|d\.?lgs\.?|d\.?lg\.?|d\.?l\.?|legge|l\.)\s*` +
    String.raw`(\d{1,2})\s+(${Object.keys(MESI).join("|")})\s+((?:19|20)\d{2})\s*,?\s*n\.?\s*(\d{1,4})\b`,
  "gi",
);

/**
 * Interpreta un riferimento in forma libera — quello che un utente (o il modello)
 * scrive a `corpus_norma`: "art. 51 TUIR", "articolo 17 comma 6 DPR 633/72",
 * "DPR 917/1986". Ritorna null se non riconosce un atto: meglio dire "non lo so"
 * che cercare a caso.
 */
export function normalizzaRiferimento(grezzo: string): Riferimento | null {
  const testo = grezzo.trim();
  if (testo === "") return null;

  const articolo = estraiArticolo(testo);
  const comma = estraiComma(testo);
  const atto = risolviAtto(testo);
  if (!atto) return null;

  return {
    riferimento: formattaRiferimento({ ...atto, articolo, comma }),
    urn: atto.noto ? urnDi(atto.noto, articolo) : null,
    sigla: atto.sigla,
    numero: atto.numero,
    anno: atto.anno,
    articolo,
    comma,
  };
}

function estraiArticolo(testo: string): string | null {
  const m = testo.match(
    new RegExp(String.raw`\bart(?:icolo)?\.?\s*(\d+\s*-?\s*(?:${SUFFISSI})?)`, "i"),
  );
  return m ? normalizzaNumeroArticolo(m[1]) : null;
}

function estraiComma(testo: string): string | null {
  const m = testo.match(
    new RegExp(String.raw`\b(?:comma|c\.)\s*(\d+\s*-?\s*(?:${SUFFISSI})?)`, "i"),
  );
  return m ? normalizzaNumeroArticolo(m[1]) : null;
}

export type AttoRisolto = {
  sigla: string;
  numero: number;
  anno: number;
  /** Presente solo se l'atto è nel registro `ATTI` (allora sappiamo l'URN). */
  noto: Atto | null;
};

/** Risolve l'atto da una stringa: prima gli estremi espliciti, poi gli alias. */
export function risolviAtto(testo: string): AttoRisolto | null {
  RE_ATTO_ESTESO.lastIndex = 0;
  const esteso = RE_ATTO_ESTESO.exec(testo);
  if (esteso) {
    const sigla = siglaCanonica(esteso[1]);
    const anno = Number(esteso[4]);
    const numero = Number(esteso[5]);
    if (sigla) {
      return { sigla, numero, anno, noto: attoPerEstremi(sigla, numero, anno) };
    }
  }

  RE_ATTO_COMPATTO.lastIndex = 0;
  const compatto = RE_ATTO_COMPATTO.exec(testo);
  if (compatto) {
    const sigla = siglaCanonica(compatto[1]);
    const numero = Number(compatto[2]);
    const anno = espandiAnno(compatto[3] ?? compatto[4]);
    if (sigla) {
      return { sigla, numero, anno, noto: attoPerEstremi(sigla, numero, anno) };
    }
  }

  for (const atto of ATTI) {
    for (const alias of atto.alias) {
      if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(testo)) {
        return {
          sigla: atto.sigla,
          numero: atto.numero,
          anno: atto.anno,
          noto: atto,
        };
      }
    }
  }
  return null;
}

/** "72" → 1972, "26" → 2026. Le norme fiscali citate a due cifre sono del '900. */
function espandiAnno(grezzo: string): number {
  const n = Number(grezzo);
  if (grezzo.length === 4) return n;
  return n >= 50 ? 1900 + n : 2000 + n;
}

export {
  RE_ATTO_COMPATTO,
  RE_ATTO_ESTESO,
  SUFFISSI,
  espandiAnno,
  normalizzaNumeroArticolo,
  siglaCanonica,
};
