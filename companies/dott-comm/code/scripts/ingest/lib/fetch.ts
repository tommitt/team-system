/**
 * Client HTTP educato + cache su disco per gli adapter di ingestione.
 *
 * Stiamo scaricando da siti pubblici della PA che nessuno ha dimensionato per
 * noi: 1 richiesta/secondo, User-Agent identificabile, retry con backoff. La
 * cache in `code/.ingest-cache/` (gitignored) rende gratuito rieseguire un
 * adapter mentre si itera sul parsing — che è il grosso del lavoro.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const USER_AGENT =
  "DottComm-corpus/0.1 (ingestione fonti fiscali pubbliche; ttassi@denied.dev)";
const INTERVALLO_MS = 1000;
const CACHE_DIR = join(process.cwd(), ".ingest-cache");

let ultimaRichiesta = 0;

async function attendiIlTurno(): Promise<void> {
  const attesa = ultimaRichiesta + INTERVALLO_MS - Date.now();
  if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
  ultimaRichiesta = Date.now();
}

function percorsoCache(url: string, estensione: string): string {
  const digest = createHash("sha256").update(url).digest("hex").slice(0, 32);
  return join(CACHE_DIR, `${digest}.${estensione}`);
}

async function scarica(
  url: string,
  tentativi = 3,
  sessione?: Sessione,
): Promise<Buffer> {
  let ultimoErrore: unknown;
  for (let i = 0; i < tentativi; i++) {
    await attendiIlTurno();
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          ...(sessione ? { cookie: sessione.header() } : {}),
        },
        redirect: "follow",
      });
      sessione?.assorbi(res);
      // 4xx (tranne 429) non migliora ritentando: fallisci subito e forte.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status} su ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      ultimoErrore = err;
      if (err instanceof Error && /HTTP 4(?!29)/.test(err.message)) throw err;
      const backoff = 2 ** i * 1000;
      console.warn(`  ↻ retry ${i + 1}/${tentativi} tra ${backoff}ms — ${url}`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw ultimoErrore instanceof Error
    ? ultimoErrore
    : new Error(`download fallito: ${url}`);
}

/**
 * Sessione con cookie. Normattiva serve l'export Akoma Ntoso solo a chi ha prima
 * risolto l'URN dell'atto (JSESSIONID + cookie di edge): senza sessione la stessa
 * URL risponde 200 con una pagina d'errore HTML invece che con l'XML.
 */
export class Sessione {
  private cookies = new Map<string, string>();

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  assorbi(res: Response): void {
    for (const riga of res.headers.getSetCookie()) {
      const [coppia] = riga.split(";");
      const idx = coppia.indexOf("=");
      if (idx > 0) {
        this.cookies.set(coppia.slice(0, idx).trim(), coppia.slice(idx + 1).trim());
      }
    }
  }

  get(url: string, estensione: "html" | "pdf" | "xml" = "html"): Promise<Buffer> {
    return scaricaConCache(url, estensione, this);
  }
}

/** Scarica con cache su disco. `estensione` serve solo a rendere ispezionabile la cache. */
export async function scaricaConCache(
  url: string,
  estensione: "html" | "pdf" | "xml" = "html",
  sessione?: Sessione,
): Promise<Buffer> {
  const percorso = percorsoCache(url, estensione);
  try {
    return await readFile(percorso);
  } catch {
    // cache miss: si scarica
  }
  const buf = await scarica(url, 3, sessione);
  await mkdir(dirname(percorso), { recursive: true });
  await writeFile(percorso, buf);
  return buf;
}

export async function scaricaTesto(
  url: string,
  estensione: "html" | "xml" = "html",
): Promise<string> {
  return (await scaricaConCache(url, estensione)).toString("utf8");
}

/** sha256 del raw scaricato: è il contratto di idempotenza degli adapter. */
export function hashContenuto(dati: Buffer | string): string {
  return createHash("sha256").update(dati).digest("hex");
}
