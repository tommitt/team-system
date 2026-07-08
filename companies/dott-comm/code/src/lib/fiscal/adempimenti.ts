/**
 * Derivazione dello scadenzario — funzioni pure (scadenze_cliente).
 *
 * Dagli attributi di un cliente deriva gli adempimenti applicabili e le loro
 * occorrenze in un intervallo di date: la matrice cliente × adempimento ×
 * scadenza che il problem-space indica come "the central data model any agent
 * system must own" (area 08). Le date sono quelle del regime TIPICO e vanno
 * riverificate ogni anno contro il calendario vigente (proroghe incluse):
 * ogni output è una bozza.
 *
 * Le scadenze che cadono di sabato/festivo slittano al primo giorno lavorativo
 * (art. 18 D.Lgs. 241/1997) via `calendario.ts`.
 */
import { slittaSeFestivo } from "./calendario";

export type AttributiCliente = {
  /** Regime contabile/fiscale del cliente. */
  regime: "forfettario" | "semplificata" | "ordinaria";
  forma:
    | "persona_fisica"
    | "ditta_individuale"
    | "professionista"
    | "societa_persone"
    | "societa_capitali";
  /** Default: mensile se ordinaria, trimestrale se semplificata, nessuna se forfettario. */
  ivaPeriodicita?: "mensile" | "trimestrale" | "nessuna";
  /** Opera ritenute su compensi (CU/770/versamenti mensili). */
  sostitutoImposta?: boolean;
  /** Iscritto INPS artigiani/commercianti (rate fisse trimestrali). */
  inpsArtigianiCommercianti?: boolean;
  /** Possiede immobili soggetti a IMU. */
  immobili?: boolean;
  /** Operatore sanitario: invio Sistema Tessera Sanitaria. */
  sanitario?: boolean;
  /** Sopra soglia Intrastat (elenchi mensili). */
  intrastat?: boolean;
};

export type Occorrenza = {
  adempimento: string;
  /** Area del problem-space di provenienza (01, 02, 03...). */
  area: string;
  /** Scadenza tipica, già slittata se festiva. */
  scadenza: string; // YYYY-MM-DD
  nota?: string;
};

/** Regola: nome + condizione di applicabilità + generatore di date per anno. */
type Regola = {
  adempimento: string;
  area: string;
  applicabile: (a: AttributiCliente) => boolean;
  /** Date (YYYY-MM-DD) dell'anno dato, PRIMA dello slittamento festivo. */
  date: (anno: number) => { data: string; nota?: string }[];
  nota?: string;
};

function haIva(a: AttributiCliente): boolean {
  return ivaPeriodicita(a) !== "nessuna";
}

function ivaPeriodicita(a: AttributiCliente): "mensile" | "trimestrale" | "nessuna" {
  if (a.ivaPeriodicita) return a.ivaPeriodicita;
  if (a.regime === "forfettario") return "nessuna";
  return a.regime === "ordinaria" ? "mensile" : "trimestrale";
}

function isImpresa(a: AttributiCliente): boolean {
  return (
    a.forma === "ditta_individuale" ||
    a.forma === "societa_persone" ||
    a.forma === "societa_capitali"
  );
}

const mesi12 = Array.from({ length: 12 }, (_, i) => i + 1);
const mm = (m: number) => String(m).padStart(2, "0");

const REGOLE: Regola[] = [
  {
    adempimento: "Liquidazione e versamento IVA mensile",
    area: "01",
    applicabile: (a) => ivaPeriodicita(a) === "mensile",
    date: (anno) =>
      mesi12.map((m) => ({
        data: `${anno}-${mm(m)}-16`,
        nota: `periodo ${mm(m === 1 ? 12 : m - 1)}/${m === 1 ? anno - 1 : anno}`,
      })),
  },
  {
    adempimento: "Liquidazione e versamento IVA trimestrale",
    area: "01",
    applicabile: (a) => ivaPeriodicita(a) === "trimestrale",
    date: (anno) => [
      { data: `${anno}-05-16`, nota: "1° trimestre (+1% interessi)" },
      { data: `${anno}-08-20`, nota: "2° trimestre (+1% interessi)" },
      { data: `${anno}-11-16`, nota: "3° trimestre (+1% interessi)" },
      { data: `${anno}-03-16`, nota: `4° trimestre ${anno - 1} in dichiarazione IVA` },
    ],
  },
  {
    adempimento: "Acconto IVA",
    area: "02",
    applicabile: haIva,
    date: (anno) => [{ data: `${anno}-12-27` }],
  },
  {
    adempimento: "Comunicazione liquidazioni periodiche IVA (LIPE)",
    area: "02",
    applicabile: haIva,
    date: (anno) => [
      { data: `${anno}-05-31`, nota: "1° trimestre" },
      { data: `${anno}-09-30`, nota: "2° trimestre" },
      { data: `${anno}-11-30`, nota: "3° trimestre" },
      { data: `${anno}-02-28`, nota: `4° trimestre ${anno - 1} (o in dichiarazione IVA)` },
    ],
  },
  {
    adempimento: "Dichiarazione IVA annuale",
    area: "02",
    applicabile: haIva,
    date: (anno) => [{ data: `${anno}-04-30`, nota: `anno d'imposta ${anno - 1}` }],
  },
  {
    adempimento: "Imposta di bollo su fatture elettroniche",
    area: "02",
    applicabile: haIva,
    date: (anno) => [
      { data: `${anno}-05-31`, nota: "1° trimestre" },
      { data: `${anno}-09-30`, nota: "2° trimestre" },
      { data: `${anno}-11-30`, nota: "3° trimestre" },
      { data: `${anno}-02-28`, nota: `4° trimestre ${anno - 1}` },
    ],
    nota: "soglie di rinvio per importi minimi",
  },
  {
    adempimento: "Versamento ritenute (sostituto d'imposta)",
    area: "02",
    applicabile: (a) => a.sostitutoImposta === true,
    date: (anno) =>
      mesi12.map((m) => ({
        data: `${anno}-${mm(m)}-16`,
        nota: "ritenute del mese precedente",
      })),
  },
  {
    adempimento: "Certificazione Unica (CU)",
    area: "02",
    applicabile: (a) => a.sostitutoImposta === true,
    date: (anno) => [{ data: `${anno}-03-16`, nota: "trasmissione e consegna" }],
  },
  {
    adempimento: "Modello 770",
    area: "02",
    applicabile: (a) => a.sostitutoImposta === true,
    date: (anno) => [{ data: `${anno}-10-31` }],
  },
  {
    adempimento: "Saldo imposte + 1° acconto",
    area: "02",
    applicabile: () => true,
    date: (anno) => [
      { data: `${anno}-06-30`, nota: "o +30 gg con maggiorazione 0,4% — verificare proroghe" },
    ],
  },
  {
    adempimento: "2° acconto imposte",
    area: "02",
    applicabile: () => true,
    date: (anno) => [{ data: `${anno}-11-30` }],
  },
  {
    adempimento: "Dichiarazione dei redditi (trasmissione)",
    area: "02",
    applicabile: () => true,
    date: (anno) => [{ data: `${anno}-10-31`, nota: `anno d'imposta ${anno - 1}` }],
  },
  {
    adempimento: "Diritto camerale annuale",
    area: "02",
    applicabile: isImpresa,
    date: (anno) => [{ data: `${anno}-06-30`, nota: "col 1° acconto imposte" }],
  },
  {
    adempimento: "Contributi INPS artigiani/commercianti (rate fisse)",
    area: "02",
    applicabile: (a) => a.inpsArtigianiCommercianti === true,
    date: (anno) => [
      { data: `${anno}-02-16` },
      { data: `${anno}-05-16` },
      { data: `${anno}-08-20` },
      { data: `${anno}-11-16` },
    ],
    nota: "eccedenze sul reddito con saldo/acconti imposte",
  },
  {
    adempimento: "IMU",
    area: "02",
    applicabile: (a) => a.immobili === true,
    date: (anno) => [
      { data: `${anno}-06-16`, nota: "acconto" },
      { data: `${anno}-12-16`, nota: "saldo" },
    ],
  },
  {
    adempimento: "Approvazione bilancio (assemblea entro 120 gg)",
    area: "03",
    applicabile: (a) => a.forma === "societa_capitali",
    date: (anno) => [{ data: `${anno}-04-30`, nota: "esercizio solare; 180 gg se motivato" }],
  },
  {
    adempimento: "Deposito bilancio al Registro Imprese",
    area: "03",
    applicabile: (a) => a.forma === "societa_capitali",
    date: (anno) => [{ data: `${anno}-05-30`, nota: "30 gg dall'approvazione (se 30/4)" }],
  },
  {
    adempimento: "Trasmissione Sistema Tessera Sanitaria",
    area: "02",
    applicabile: (a) => a.sanitario === true,
    date: (anno) => [{ data: `${anno}-01-31`, nota: `spese ${anno - 1} — verificare il regime vigente` }],
  },
  {
    adempimento: "Elenchi Intrastat",
    area: "02",
    applicabile: (a) => a.intrastat === true,
    date: (anno) =>
      mesi12.map((m) => ({
        data: `${anno}-${mm(m)}-25`,
        nota: "periodo precedente",
      })),
  },
];

/**
 * Deriva le occorrenze di scadenzario per il cliente nell'intervallo
 * [da, a] (estremi inclusi), ordinate per data. Le date sono quelle del regime
 * tipico, slittate se festive; proroghe e casi particolari vanno verificati.
 */
export function derivaScadenzario(params: {
  attributi: AttributiCliente;
  da: string; // YYYY-MM-DD
  a: string; // YYYY-MM-DD
}): Occorrenza[] {
  const { attributi, da, a } = params;
  if (a < da) throw new Error(`Intervallo invertito: da=${da} > a=${a}`);

  const annoDa = Number(da.slice(0, 4));
  const annoA = Number(a.slice(0, 4));
  const anni: number[] = [];
  for (let y = annoDa; y <= annoA; y += 1) anni.push(y);

  const occorrenze: Occorrenza[] = [];
  for (const regola of REGOLE) {
    if (!regola.applicabile(attributi)) continue;
    for (const anno of anni) {
      for (const { data, nota } of regola.date(anno)) {
        const scadenza = slittaSeFestivo(data);
        if (scadenza < da || scadenza > a) continue;
        occorrenze.push({
          adempimento: regola.adempimento,
          area: regola.area,
          scadenza,
          nota: [nota, regola.nota].filter(Boolean).join("; ") || undefined,
        });
      }
    }
  }

  return occorrenze.sort(
    (x, y) =>
      x.scadenza.localeCompare(y.scadenza) ||
      x.adempimento.localeCompare(y.adempimento),
  );
}

/** Elenco (deduplicato) degli adempimenti applicabili al cliente, senza date. */
export function adempimentiApplicabili(attributi: AttributiCliente): string[] {
  return REGOLE.filter((r) => r.applicabile(attributi)).map(
    (r) => r.adempimento,
  );
}
