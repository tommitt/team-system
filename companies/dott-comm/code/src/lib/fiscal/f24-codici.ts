/**
 * Codici tributo F24 per i versamenti del cuneo (saldo + acconti + interessi
 * rateazione). Dati puri.
 *
 * ⚠️ DA VERIFICARE. I codici tributo cambiano per risoluzione dell'Agenzia
 * delle Entrate; questa è la mappa dei casi più comuni del cuneo, da confermare
 * sulla tabella AdE vigente prima dell'uso. Il tool li propone come bozza.
 */

export type Tributo = "irpef" | "forfettario" | "cedolare" | "irap" | "iva";
export type TipoVersamento = "saldo" | "acconto_prima" | "acconto_seconda";

type MappaTributo = Partial<Record<TipoVersamento, string>>;

const CODICI: Record<Tributo, MappaTributo> = {
  irpef: { saldo: "4001", acconto_prima: "4033", acconto_seconda: "4034" },
  forfettario: {
    saldo: "1792",
    acconto_prima: "1790",
    acconto_seconda: "1791",
  },
  cedolare: { saldo: "1842", acconto_prima: "1840", acconto_seconda: "1841" },
  irap: { saldo: "3800", acconto_prima: "3812", acconto_seconda: "3813" },
  iva: { saldo: "6099" },
};

/** Codice tributo per interessi sul pagamento rateale (tributi erariali). */
export const CODICE_INTERESSI_RATEIZZO_ERARIALE = "1668";
/** Codice tributo per interessi rateazione IRAP (tributo regionale). */
export const CODICE_INTERESSI_RATEIZZO_IRAP = "3805";

/** Restituisce il codice tributo, o undefined se la combinazione non è mappata. */
export function codiceF24(
  tributo: Tributo,
  tipo: TipoVersamento,
): string | undefined {
  return CODICI[tributo]?.[tipo];
}

/** Codice interessi rateazione coerente col tributo (IRAP → regionale). */
export function codiceInteressiRateizzo(tributo: Tributo): string {
  return tributo === "irap"
    ? CODICE_INTERESSI_RATEIZZO_IRAP
    : CODICE_INTERESSI_RATEIZZO_ERARIALE;
}
