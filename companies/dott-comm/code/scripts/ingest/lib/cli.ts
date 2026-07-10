/**
 * Flag comuni agli adapter di ingestione: `--anno --limit --dry-run --incremental`.
 * Piccolo parser fatto a mano: una dipendenza in meno per sei flag.
 *
 * Carica anche `.env.local` (gli script girano fuori da Next, che altrimenti
 * sarebbe l'unico a leggerlo).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Opzioni = {
  anno?: number;
  limit?: number;
  dryRun: boolean;
  incremental: boolean;
  model?: string;
};

export function parseArgv(argv: string[] = process.argv.slice(2)): Opzioni {
  const opts: Opzioni = { dryRun: false, incremental: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const valore = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} richiede un valore`);
      return v;
    };
    switch (arg) {
      case "--anno":
        opts.anno = Number(valore());
        break;
      case "--limit":
        opts.limit = Number(valore());
        break;
      case "--model":
        opts.model = valore();
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--incremental":
        opts.incremental = true;
        break;
      default:
        throw new Error(`flag sconosciuto: ${arg}`);
    }
  }
  return opts;
}

/** Carica `.env.local` nel process.env (senza sovrascrivere ciò che c'è già). */
export function caricaEnv(): void {
  for (const file of [".env.local", ".env"]) {
    let contenuto: string;
    try {
      contenuto = readFileSync(join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const riga of contenuto.split("\n")) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const chiave = m[1];
      if (process.env[chiave] !== undefined) continue;
      process.env[chiave] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

/** Wrapper: carica env, esegue, stampa l'errore in modo leggibile ed esce ≠0. */
export async function eseguiScript(fn: () => Promise<void>): Promise<void> {
  caricaEnv();
  try {
    await fn();
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
