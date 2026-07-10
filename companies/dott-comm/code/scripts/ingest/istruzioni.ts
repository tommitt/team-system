/**
 * Adapter istruzioni ministeriali ai modelli (ADR 0014).
 *
 * La densità di risposte operative per pagina è la più alta del corpus: "in che
 * rigo va il credito d'imposta X" è una domanda puntuale, e la risposta è qui.
 *
 * Fonte guidata da MANIFEST esplicito (`manifests/istruzioni-<anno>.json`): sono
 * ~12 URL l'anno e cambiano una volta l'anno. Aggiornare il manifest È il
 * refresh — nessun crawler da mantenere contro un sito che si riorganizza.
 *
 * `anno_imposta = annoModello − 1`: il modello Redditi PF 2026 dichiara i redditi
 * del 2025. Sbagliare questo significa rispondere con le regole dell'anno dopo —
 * ed è esattamente il fallimento temporale che l'ADR 0014 esiste per impedire.
 *
 * Struttura: gli "ancoraggi" del documento sono QUADRO → SEZIONE → Rigo. Lo spike
 * del 2026-07-10 su `pf1_istruzioni_2026` (183 pp., multi-colonna) ha mostrato
 * un'estrazione pulita con `unpdf` (29 QUADRO, 20 SEZIONE, 138 Rigo): la escape
 * hatch Python/PyMuPDF prevista dal piano NON è servita.
 *
 *   npm run ingest:istruzioni -- --anno 2026 --limit 1 --dry-run
 */
import { hashContenuto, scaricaConCache } from "./lib/fetch";
import { estraiPagine, paginaDiOffset, unisciPagine } from "./lib/pdf";
import {
  costruisciChunks,
  percorso,
  ripulisciTestoPdf,
  type ChunkGrezzo,
} from "./lib/chunker";
import { apriRun, chiudiRun } from "./lib/db";
import { caricaManifest, type FascicoloManifest } from "./lib/manifest";
import { collegaCitazioniAiDocumenti, upsertDocumento } from "./lib/upsert";
import { eseguiScript, parseArgv } from "./lib/cli";

const ANNO_MANIFEST_DEFAULT = 2026;

type Livello = 1 | 2 | 3;
type Ancora = { offset: number; livello: Livello; etichetta: string };

// QUADRO RC - Redditi di lavoro dipendente… | SEZIONE I – … | Rigo RC1
const ANCORE: { re: RegExp; livello: Livello }[] = [
  { re: /^[ \t]*(QUADRO\s+[A-Z]{1,3}\b[^\n]{0,90})$/gm, livello: 1 },
  { re: /^[ \t]*(SEZIONE\s+[IVX]+\b[^\n]{0,90})$/gm, livello: 2 },
  { re: /^[ \t]*(Righi?\s+[A-Z]{1,3}\d+(?:\s*[–-]\s*[A-Z]{1,3}?\d+)?)\b/gm, livello: 3 },
];

/**
 * Un chunk per gruppo di righi, dentro il suo QUADRO e la sua SEZIONE. Il testo
 * di un rigo senza il suo quadro è inutilizzabile ("indicare l'importo" — di
 * cosa?), quindi il percorso porta sempre la catena completa.
 */
export function chunksDaIstruzioni(
  testoPaginato: ReturnType<typeof unisciPagine>,
  percorsoBase: string,
): ChunkGrezzo[] {
  const testo = testoPaginato.testo;

  const ancore: Ancora[] = [];
  for (const { re, livello } of ANCORE) {
    re.lastIndex = 0;
    for (let m = re.exec(testo); m; m = re.exec(testo)) {
      ancore.push({
        offset: m.index,
        livello,
        etichetta: m[1].replace(/\s+/g, " ").trim(),
      });
    }
  }
  ancore.sort((a, b) => a.offset - b.offset);

  if (ancore.length === 0) {
    return [
      {
        percorso: percorsoBase,
        testo: ripulisciTestoPdf(testo),
        paginaDa: 1,
        paginaA: testoPaginato.offsets.length,
      },
    ];
  }

  const unita: ChunkGrezzo[] = [];
  let gerarchia: Ancora[] = [];

  for (let i = 0; i < ancore.length; i++) {
    const ancora = ancore[i];
    gerarchia = gerarchia.filter((g) => g.livello < ancora.livello);
    gerarchia.push(ancora);

    const inizio = ancora.offset;
    const fine = i + 1 < ancore.length ? ancore[i + 1].offset : testo.length;
    const corpo = ripulisciTestoPdf(testo.slice(inizio, fine));
    if (corpo === "") continue;

    unita.push({
      percorso: percorso(percorsoBase, ...gerarchia.map((g) => g.etichetta)),
      testo: corpo,
      paginaDa: paginaDiOffset(testoPaginato, inizio),
      paginaA: paginaDiOffset(testoPaginato, Math.max(inizio, fine - 1)),
    });
  }
  return unita;
}

async function main(): Promise<void> {
  const opts = parseArgv();
  const annoManifest = opts.anno ?? ANNO_MANIFEST_DEFAULT;
  const fascicoli = caricaManifest<FascicoloManifest>(
    `istruzioni-${annoManifest}.json`,
    "fascicoli",
  );
  const daFare = opts.limit ? fascicoli.slice(0, opts.limit) : fascicoli;

  const run = await apriRun("istruzioni_modelli");
  console.log(`Istruzioni modelli ${annoManifest} — ${daFare.length} fascicoli\n`);

  try {
    for (const f of daFare) {
      const annoImposta = f.annoModello - 1;
      const pdf = await scaricaConCache(f.url, "pdf");
      const pagine = await estraiPagine(pdf);
      const testoPaginato = unisciPagine(pagine);

      const base = `${f.estremi} (anno d'imposta ${annoImposta})`;
      const unita = chunksDaIstruzioni(testoPaginato, base);
      const chunks = costruisciChunks(unita);

      const esito = await upsertDocumento(
        {
          fonte: "istruzioni_modelli",
          tipo: "istruzioni",
          estremi: f.estremi,
          titolo: f.titolo,
          identificativo: f.identificativo,
          urlOrigine: f.url,
          annoImposta,
          hashContenuto: hashContenuto(pdf),
        },
        chunks,
        run,
        { dryRun: opts.dryRun },
      );
      console.log(
        `  ${esito.padEnd(11)} ${f.estremi} — ${pagine.length} pp, ${chunks.length} chunk (anno d'imposta ${annoImposta})`,
      );
    }

    if (!opts.dryRun) {
      const collegate = await collegaCitazioniAiDocumenti();
      console.log(`\nGrafo citazionale: ${collegate} archi chiusi su norme note.`);
    }
    await chiudiRun(run, "ok", {
      cursore: opts.dryRun ? undefined : { anno_modello: annoManifest },
      note: opts.dryRun ? "dry-run: nessuna scrittura" : undefined,
    });
    console.log(
      `\n✓ visti ${run.visti} · nuovi ${run.nuovi} · aggiornati ${run.aggiornati} · chunk ${run.chunk}`,
    );
  } catch (err) {
    await chiudiRun(run, "errore", {
      note: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

void eseguiScript(main);
