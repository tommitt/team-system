/** Caricamento dei manifest di ingestione (JSON accanto agli adapter). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));

export type AttoManifest = {
  identificativo: string;
  urn: string;
  estremi: string;
  titolo: string;
};

export type FascicoloManifest = {
  identificativo: string;
  estremi: string;
  titolo: string;
  url: string;
  /** Anno del MODELLO; l'anno d'imposta è questo − 1. */
  annoModello: number;
  modello: string;
};

export function caricaManifest<T>(nome: string, chiave: string): T[] {
  const percorso = join(QUI, "..", "manifests", nome);
  const json = JSON.parse(readFileSync(percorso, "utf8")) as Record<
    string,
    unknown
  >;
  const voci = json[chiave];
  if (!Array.isArray(voci)) {
    throw new Error(`manifest ${nome}: chiave "${chiave}" mancante o non array`);
  }
  return voci as T[];
}
