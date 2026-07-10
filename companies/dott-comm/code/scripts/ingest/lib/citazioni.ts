/**
 * Estrattore di citazioni normative, regex-first (ADR 0014 §7).
 *
 * Le citazioni normative italiane sono estremamente regolari: la regex copre la
 * massa a costo zero, in modo deterministico e testabile. Il residuo ambiguo
 * (citazioni ellittiche — "il medesimo articolo", "la norma citata" — e note
 * redazionali) va al pass LLM (`scripts/enrich/citazioni-batch.ts`), che atterra
 * `approvata=false` in attesa del sign-off umano (`/verifica-fonti`).
 *
 * Le citazioni regex sono `approvata=true` all'origine: sono derivate
 * meccanicamente dal testo, non inferite: non c'è niente da approvare.
 */
import {
  SUFFISSI,
  formattaRiferimento,
  risolviAtto,
  urnDi,
} from "../../../src/lib/parse/riferimenti-norma";

export type CitazioneEstratta = {
  riferimento: string;
  urn: string | null;
  testoGrezzo: string;
  metodo: "regex";
};

/** Quanto testo dopo l'articolo può ancora contenere il suo atto. */
const FINESTRA_ATTO = 90;

const RE_ARTICOLO = new RegExp(
  String.raw`\bart(?:icolo)?\.?\s*(\d+\s*-?\s*(?:${SUFFISSI})?)` +
    String.raw`((?:\s*,?\s*(?:comm[ai]|c\.)\s*\d+\s*-?\s*(?:${SUFFISSI})?)?)`,
  "gi",
);
const RE_COMMA_LOCALE = new RegExp(
  String.raw`(?:comm[ai]|c\.)\s*(\d+\s*-?\s*(?:${SUFFISSI})?)`,
  "i",
);
const RE_ATTO_QUALSIASI = new RegExp(
  String.raw`\b(?:d\.?p\.?r\.?|d\.?lgs\.?|d\.?lg\.?|d\.?l\.?|legge|l\.)\s*` +
    String.raw`(?:n\.?\s*)?\d{1,4}\s*(?:\/\s*(?:19|20)?\d{2}|\s+del\s+(?:19|20)\d{2})` +
    String.raw`|\b(?:tuir|statuto del contribuente)\b`,
  "gi",
);

function normalizzaNumero(grezzo: string): string {
  const m = grezzo
    .toLowerCase()
    .replace(/\s+/g, "")
    .match(new RegExp(`^(\\d+)-?(${SUFFISSI})?$`));
  if (!m) return grezzo.trim();
  return m[2] ? `${m[1]}-${m[2]}` : m[1];
}

/**
 * Estrae tutte le citazioni da un chunk. Due passate:
 *
 * 1. **Articolo → atto**: per ogni "art. N[, comma M]" si cerca l'atto nella
 *    finestra di testo che segue. Senza atto la citazione è ellittica ("ai sensi
 *    del medesimo articolo") e viene scartata: è il lavoro del pass LLM, non
 *    della regex — indovinare l'atto è precisamente il modo di corrompere il grafo.
 * 2. **Atto nudo**: gli atti citati senza articolo ("come da DPR 633/1972") che
 *    non sono già stati consumati da una citazione con articolo.
 *
 * Deduplica per `riferimento`: un chunk che cita tre volte l'art. 51 TUIR
 * produce un solo arco del grafo.
 */
export function estraiCitazioni(testo: string): CitazioneEstratta[] {
  const trovate = new Map<string, CitazioneEstratta>();
  const consumati: Array<[number, number]> = [];

  RE_ARTICOLO.lastIndex = 0;
  for (let m = RE_ARTICOLO.exec(testo); m; m = RE_ARTICOLO.exec(testo)) {
    const inizio = m.index;
    const fineMatch = inizio + m[0].length;
    const finestra = testo.slice(fineMatch, fineMatch + FINESTRA_ATTO);
    const atto = risolviAtto(finestra);
    if (!atto) continue;

    const articolo = normalizzaNumero(m[1]);
    const commaMatch = m[2] ? m[2].match(RE_COMMA_LOCALE) : null;
    const comma = commaMatch ? normalizzaNumero(commaMatch[1]) : null;

    const riferimento = formattaRiferimento({ ...atto, articolo, comma });
    consumati.push([inizio, fineMatch + FINESTRA_ATTO]);
    if (!trovate.has(riferimento)) {
      trovate.set(riferimento, {
        riferimento,
        urn: atto.noto ? urnDi(atto.noto, articolo) : null,
        testoGrezzo: testo.slice(inizio, Math.min(fineMatch + 40, testo.length)).trim(),
        metodo: "regex",
      });
    }
  }

  RE_ATTO_QUALSIASI.lastIndex = 0;
  for (let m = RE_ATTO_QUALSIASI.exec(testo); m; m = RE_ATTO_QUALSIASI.exec(testo)) {
    const pos = m.index;
    if (consumati.some(([da, a]) => pos >= da && pos < a)) continue;

    const atto = risolviAtto(m[0]);
    if (!atto) continue;
    const riferimento = formattaRiferimento({
      ...atto,
      articolo: null,
      comma: null,
    });
    if (!trovate.has(riferimento)) {
      trovate.set(riferimento, {
        riferimento,
        urn: atto.noto ? urnDi(atto.noto, null) : null,
        testoGrezzo: m[0].trim(),
        metodo: "regex",
      });
    }
  }

  return [...trovate.values()];
}
