/**
 * Registro delle costanti fiscali — l'infrastruttura di provenienza (ADR 0011).
 *
 * Ogni costante a peso legale è un DATO con provenienza, non un numero nudo:
 * `{ valore, fonte, verificatoIl }`, più la vigenza temporale per i valori che
 * cambiano nel tempo (tasso legale, scaglioni di rate, festività…). Regole:
 *
 * - Il registro (in `constants.ts`) è l'unica source of truth: valore e fonte
 *   viaggiano insieme e si aggiornano insieme.
 * - Un lookup fuori dalle vigenze note NON fallisce silenziosamente: restituisce
 *   il valore più plausibile con `verificato: false` e una nota che i tool
 *   DEVONO esporre nell'output (bozza con caveat rumoroso, mai numero sbagliato
 *   zitto).
 * - La ri-verifica periodica è la skill `/verifica-costanti`, che confronta i
 *   valori del registro con le fonti ufficiali e aggiorna `verificatoIl`.
 */

export type Provenienza = {
  /** Norma di riferimento + fonte usata per la verifica. */
  fonte: string;
  /** Ultima verifica su fonte ufficiale (YYYY-MM-DD); null = mai verificata. */
  verificatoIl: string | null;
};

/** Costante scalare con provenienza. */
export type Costante<T> = Provenienza & { valore: T };

/** Voce di una tabella tempo-indicizzata; estremo di vigenza mancante = aperto. */
export type VoceVigente<T> = Costante<T> & {
  vigenzaDa?: string; // YYYY-MM-DD, inclusivo
  vigenzaA?: string; // YYYY-MM-DD, inclusivo
};

/** Esito di un lookup: porta sempre valore + provenienza + stato di verifica. */
export type Lookup<T> = Provenienza & {
  valore: T;
  /** false se la data è fuori dalle vigenze note o la voce non è verificata. */
  verificato: boolean;
  /** Presente quando `verificato` è false: i tool la espongono nell'output. */
  nota?: string;
};

/** Shorthand per dichiarare una costante scalare con provenienza. */
export function costante<T>(
  valore: T,
  fonte: string,
  verificatoIl: string | null,
): Costante<T> {
  return { valore, fonte, verificatoIl };
}

/**
 * Cerca la voce vigente alla data. Se nessuna vigenza copre la data, applica la
 * voce più vicina (l'ultima con `vigenzaDa` ≤ data, altrimenti la prima) con
 * `verificato: false` e una nota esplicita: meglio un caveat rumoroso di un
 * valore stantio silenzioso.
 */
export function lookupVigente<T>(
  nome: string,
  tabella: readonly VoceVigente<T>[],
  dataISO: string,
): Lookup<T> {
  if (tabella.length === 0) {
    throw new Error(`Registro: tabella vuota per "${nome}"`);
  }

  const copre = (v: VoceVigente<T>) =>
    (v.vigenzaDa === undefined || dataISO >= v.vigenzaDa) &&
    (v.vigenzaA === undefined || dataISO <= v.vigenzaA);

  const hit = tabella.find(copre);
  if (hit) {
    const verificato = hit.verificatoIl !== null;
    return {
      valore: hit.valore,
      fonte: hit.fonte,
      verificatoIl: hit.verificatoIl,
      verificato,
      nota: verificato
        ? undefined
        : `${nome}: valore mai verificato su fonte ufficiale (DA VERIFICARE)`,
    };
  }

  // Fuori vigenza: la voce più recente che precede la data, o la prima nota.
  const precedenti = tabella.filter(
    (v) => v.vigenzaDa !== undefined && v.vigenzaDa <= dataISO,
  );
  const fallback =
    precedenti.length > 0 ? precedenti[precedenti.length - 1] : tabella[0];
  return {
    valore: fallback.valore,
    fonte: fallback.fonte,
    verificatoIl: fallback.verificatoIl,
    verificato: false,
    nota:
      `${nome}: nessuna vigenza verificata copre la data ${dataISO}; ` +
      `applicato il valore più vicino (DA VERIFICARE prima dell'uso)`,
  };
}
