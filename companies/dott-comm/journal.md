# Dott. Comm. journal

Append-only log of what each substantive session changed for **Dott. Comm.**
Newest first.

Format:

```
## YYYY-MM-DD — <session title>
- **Did:** what the session set out to do
- **Changed:** knowledge / decisions / skills touched (with links)
- **Follow-ups:** anything left open
```

## 2026-07-15 — Backfill prassi 2024→2026 in prod, embed completo, fix idempotenza, skill /stato-corpus
- **Did:** completata l'ingestione del corpus in **produzione**. Prassi backfillata
  2024/2025/2026 (2023 c'era già): ora **949 doc prassi**, **7237 chunk totali**,
  **embedding 7237/7237** (0 mancanti), citazioni **11 956** (11 715 regex +
  241 LLM, tutte approvate). Arricchimento fermato al **pilota** (4 subagenti
  Haiku × 50 chunk → 84 citazioni grounded approvate, 0 allucinazioni) per scelta
  esplicita: il resto del backlog è rimandato (vedi Follow-ups).
- **Changed:**
  - **Fix idempotenza** (`code/scripts/ingest/lib/upsert.ts`): una collisione
    sull'`identificativo` unico in insert non fa più cadere l'intera run —
    `risolviCollisione` la ri-risolve come skip/update. Causa: l'AdE ri-elenca lo
    stesso interpello sotto più mesi (stesso hash). Prima crashava a metà anno.
  - **Nuovo script + npm alias** `code/scripts/ingest/status.mts` /
    `npm run ingest:status`: verifica read-only dello stato pipeline in prod
    (ingestioni/embedding/arricchimento) con verdetto azionabile.
  - **Nuova skill** [`/stato-corpus`](.claude/skills/stato-corpus/SKILL.md) che la
    incapsula.
  - Aggiornata [content/knowledge/corpus-retrieval.md](content/knowledge/corpus-retrieval.md):
    quirk AdE (ri-elencazione → collisione assorbita), resilienza idempotenza,
    caricamento env prod per gli script, comando di stato.
- **Follow-ups:**
  - **Backlog arricchimento** (~5200 chunk candidati) non drenato. Attenzione: la
    coda **non arriva mai a 0** (chunk con sole citazioni ellittiche, senza atto
    nominato). Inoltre `prep-candidates` pesca sempre gli id più bassi → ri-pesca
    la coda sterile ogni giro: per un one-pass sull'intero backlog serve prima
    paginare per id-range (oggi non implementato).
  - `corpus_ingestion_runs` ha righe `in_corso`/`errore` storiche delle
    interruzioni (rumore diagnostico, non bloccanti).
  - Untracked `code/scripts/enrich/extract-citazioni.mts`: helper di troppo creato
    da un subagente, non parte del design — da rimuovere.

## 2026-07-10 — Loop di correzione dell'arricchimento (gate anti-allucinazione)
- **Did:** chiuso il loop sui chunk rigettati. Il primo giro aveva scartato 28
  citazioni di over-reach (il modello riempiva con la sua conoscenza, non col
  testo). Fix di radice: ogni citazione ora DEVE portare una **`quote` verbatim**
  del chunk; `write-citazioni.mts` la verifica come sottostringa e scarta a monte
  chi non combacia — un atto inventato richiederebbe una quote inesistente, che
  non passa. La verifica fa grounding sulla quote (prende anche la
  misattribuzione: quote vera, atto sbagliato). Skill aggiornata con un **loop
  until-dry** (i chunk svuotati tornano candidati e si ri-processano finché non
  esce più nulla) e targeting `--ids`. Provato end-to-end: un giro di correzione
  (4 subagenti Haiku) ha **inserito 5 citazioni verbatim-grounded e bloccato 7
  allucinazioni al gate**, 0 da rivedere a mano, tutte auto-approvate.
- **Changed:** `scripts/enrich/{write-citazioni,verifica-citazioni,prep-candidates}.mts`
  (gate quote + grounding sulla quote + `--ids`); skill `/arricchisci-citazioni`
  (contratto con `quote`, loop di correzione). Due bug trovati testando e corretti:
  match robusto agli spazi unicode dei PDF (una quote copiata su un a-capo non
  falliva più) e `chunk_id` bigint restituito come stringa da node-pg (coercizione
  a numero). Prod: 3921 regex + **157 llm approvate**, 0 pending.
- **Follow-ups:** recall sui chunk che hanno GIÀ una citazione LLM ma ne
  contengono altre non estratte (oggi `prep-candidates` li esclude) — un `--modo
  recall` che riguarda i chunk sotto-citati è il prossimo affinamento.

## 2026-07-10 — Deploy corpus in prod + arricchimento a subagenti (batch ritirata)
- **Did:** portato il corpus in **produzione** e consolidato l'arricchimento
  citazioni su un'unica via. Prod (`iivhluxuxxymjmsloehh`): migrazione applicata
  (session pooler; la `REVOKE` sulla funzione `security definer` verificata),
  `COHERE_API_KEY` su Vercel, ingeriti 3 norme + 3 istruzioni + 120 prassi 2023
  (2592 chunk, **tutti embeddati**), grafo regex da 3921 archi. Retrieval
  verificato live (fringe benefit → Risposta 421/E; reverse charge → DPR 633
  art. 17). **Sostituita la Batch API** (asincrona e strozzata dal rate limit
  tier-1 da 5 req/min) con un **fan-out di subagenti Haiku** sotto l'auth della
  sessione: 8 subagenti in parallelo hanno estratto 180 citazioni in ~2 min
  (mentre il batch era ancora in coda). Verifica+sign-off (grounding) eseguiti
  nella stessa skill: **152 approvate, 28 rigettate** (over-reach del modello —
  atti non presenti nel testo, es. leggi cinema attribuite a una tabella start-up).
- **Changed:**
  - Skill: **`/arricchisci-citazioni`** (nuova — discover → fan-out → verifica →
    sign-off, un solo loop); **rimossa `/verifica-fonti`** (assorbita).
  - Codice: `scripts/enrich/{prep-candidates,write-citazioni,verifica-citazioni}.mts`
    (nuova via a subagenti); **rimossi `citazioni-batch.ts` + `lib/anthropic-batch.ts`**
    e lo script npm `enrich:citazioni`. Hardening rate-limit su `embed-missing.ts`
    (attese per-minuto sulle chiavi Cohere trial). ADR 0014 §7 e
    [corpus-retrieval.md](content/knowledge/corpus-retrieval.md) aggiornati alla
    via unica; `ANTHROPIC_API_KEY` non più necessaria (tolta dagli esempi env).
- **Follow-ups:** **chiave Cohere di produzione** (la trial regge il pilota ma
  non il backfill pieno); estendere prassi **2024→2026** (`ingest:prassi --anno
  2024…` poi `ingest:embed`); i giri di arricchimento futuri usano
  `/arricchisci-citazioni` con un cap più alto.

## 2026-07-10 — Corpus di retrieval per le domande puntuali (pipeline completa)
- **Did:** implementata la pipeline end-to-end di grounding (ADR 0014):
  ingestione (Normattiva/prassi AdE/istruzioni ai modelli) → Postgres con ricerca
  ibrida FTS+vettoriale (RRF) → 4 tool MCP `corpus_*` → arricchimento citazioni
  regex-first + LLM con sign-off. Spike reali sulle tre fonti (quirk risolti:
  export AKN di Normattiva sessione-dipendente e contenitori piatti da
  ricostruire; link-mese AdE da scrapare per i refusi negli URL; indici PDF da
  mascherare). Verificato in locale: ingest idempotente del TUIR (236 art., 398
  chunk) + 3 circolari 2023 + 2 fascicoli Redditi PF 2026; grafo citazionale che
  chiude prassi→TUIR; i 4 tool esercitati contro il DB con provenienza, avviso
  temporale e `DISCLAIMER_BOZZA`; 165 test verdi (chunker, citazioni, normalizer,
  formatter).
- **Changed:**
  - ADR: [0014-corpus-fonti-pubbliche-retrieval.md](content/decisions/0014-corpus-fonti-pubbliche-retrieval.md) (nuovo).
  - Knowledge: [corpus-retrieval.md](content/knowledge/corpus-retrieval.md) (nuovo — architettura + operazioni + quirk); env vars documentate in `.env.local.example`/`.env.example`.
  - Skill: [`verifica-fonti`](.claude/skills/verifica-fonti/SKILL.md) (nuova — sign-off del contenuto generato, gemella di `verifica-costanti`).
  - Brainstorm: [biblioteca-commercialisti.md](content/brainstorms/biblioteca-commercialisti.md) — «prossimi passi» (§5.5) segnati superati da ADR 0014.
  - Codice: `supabase/schemas/04_corpus.sql` + migrazione (con REVOKE aggiunta a mano); `src/lib/corpus/*` (retrieval lib); `src/lib/mcp/skills/corpus.ts` + composer + istruzioni server; `src/lib/parse/riferimenti-norma.ts` (normalizzatore, perno del grafo); `scripts/ingest/**` e `scripts/enrich/**` (adapter, embed, batch LLM); devDeps `tsx`/`unpdf`/`cheerio`; npm scripts `ingest:*`/`enrich:*`.
- **Poi, stessa sessione — reranker implementato** (ADR 0014 §Aggiornamento
  2026-07-10): `src/lib/corpus/rerank.ts` (Cohere rerank-3.5 sul pool ≈40 fuso,
  taglia al top-N) + `config.ts` con due opt-out espliciti `CORPUS_EMBEDDINGS` /
  `CORPUS_RERANK` (default on con la chiave; scelta: variabili esplicite, non la
  sola presenza della chiave). Entrambe le degradazioni dichiarate nell'output.
  Verificati in locale i 3 rami di degradazione (chiave assente, flag off, limite
  rispettato); +7 test (172 totali). Registrato anche che la FTS usa `ts_rank_cd`,
  non BM25 stretto (docs allineati).
- **Follow-ups (rinviati per decisione, ADR 0014):** golden set + eval harness;
  automazione refresh (cron); diff di produzione delle note redazionali +
  relativo pass LLM; valutare BM25 vero (ParadeDB `pg_search`) solo se serve.
  Prima di andare in prod servono `COHERE_API_KEY` (script + Vercel) e
  `ANTHROPIC_API_KEY` (solo script), più un giro di ingestione più profondo del
  pilota.

---

## 2026-07-08 — UX billing web: «Accedi» in nav, /account autonomo, /upgrade auto-inoltra a Stripe

- **Did:** dato un ingresso e un ruolo chiaro alle superfici billing del sito.
  Nav: bottone outline **«Accedi»** (link statico a `/account`; il proxy gestisce
  il rimbalzo a `/sign-in`, la landing resta statica). `/account` ora è la home
  autonoma dell'utente: barra di utilizzo phase-aware (helper condiviso
  `trialUsageView()` in `gate.ts`, unit-testato), checkout/portale Stripe
  diretti (niente più deviazione su `/upgrade`), sign-out **«Disconnetti»**
  (prima non esisteva alcun logout). `/upgrade` è diventato il dispatcher del
  paywall: con identità risolvibile e piano pagabile **auto-inoltra a Stripe
  Checkout** al mount (componente client `AutoSubmit` — i bot di link-preview
  non eseguono JS, quindi un GET non crea mai sessioni/customer Stripe);
  `cancel_url` = `/upgrade?canceled=1` (+ token) per evitare il redirect-loop;
  **`past_due` → portale**, mai un nuovo checkout (rischio doppio abbonamento).
  Documentato `DAILY_TOOL_CALL_LIMIT` in `.env.example` (il codice lo leggeva
  già). Tutto verificato end-to-end sullo stack locale (magic link da console,
  righe seedate via psql, Stripe test mode, Chrome headless per l'auto-forward
  reale: `/upgrade?t=…` → checkout.stripe.com in ~1s senza click).
- **Changed:**
  [ADR 0013](content/decisions/0013-billing-web-ux-account-standalone-upgrade-dispatcher.md)
  (nuova); [billing-setup.md](content/knowledge/billing-setup.md) (ruoli delle
  superfici web, past_due→portale, gotcha prefetch-bot e cancel-loop);
  [local-dev-testing.md](content/knowledge/local-dev-testing.md) (ricetta per
  mintare il token di upgrade + precedenza `UPGRADE_TOKEN_SECRET`). Codice:
  `SiteNav`, `globals.css` (`.btn-outline`), `account/{page,actions}`,
  `upgrade/{page,actions}`, `AutoSubmit.tsx`, `gate.ts` (+4 test), `.env.example`.
- **Follow-ups:** l'interstitial `/upgrade` non fa più da checkpoint «quale
  account sto pagando» — rivalutare se emergono studi multi-account; valutare
  label nav session-aware («Account» da loggati) se il copy «Accedi» confonde.

## 2026-07-08 — Loop di test locale end-to-end (DB locale + auth finta)

- **Did:** reso testabile *tutto* l'app in locale senza account esterni, dopo la
  migrazione a Better Auth self-hosted. Un solo Postgres locale (Supabase CLI)
  serve i tre consumatori: Better Auth (via `pg`), il gate billing (via PostgREST
  service_role) e la telemetria. Le migrazioni `00001–00005` — incluse tabelle
  Better Auth (`00004`) e grant `service_role` (`00005`) — si applicano allo
  start, quindi il rebuild-from-migrations funziona su un DB vergine. Due loop di
  auth "finti": **sessione web** = magic link stampato in console (nessun
  `RESEND_API_KEY`); **MCP** = identità finta via `MCP_DEV_USER_ID` +
  `MCP_REQUIRE_AUTH=false` (loop OAuth reale documentato via MCP Inspector).
  Verificato sullo stack reale: 4 righe billing seedate, 7 tabelle Better Auth,
  grant presenti, `increment_usage`/insert `tool_events` OK via PostgREST col
  service_role JWT locale.
- **Changed:**
  - **Codice (`code/`):** nuovo `supabase/seed.sql` (stati billing deterministici
    `dev_trial`/`dev_active`/`dev_canceled`/`dev_trial_spent`, idempotente, gira
    su `db:reset`); nuovo `.env.local.example` (wiring completo verso lo stack
    locale) + `.gitignore` (`!.env.local.example`); script npm
    `db:start`/`db:stop`/`db:reset`/`db:status` in `package.json`. Nessuna
    modifica al codice applicativo — riusata la escape hatch `MCP_DEV_USER_ID`.
  - **Knowledge:** nuovo runbook
    [content/knowledge/local-dev-testing.md](content/knowledge/local-dev-testing.md);
    pointer da [dev-setup-guide.md](content/knowledge/dev-setup-guide.md) (che
    resta la checklist prod/dashboard) e una riga in `companies/dott-comm/CLAUDE.md`.
- **Follow-ups:** nessun ADR (è devex/runbook, non una scelta architetturale —
  le decisioni stanno già in ADR 0012/0007/0002). Auto-apply migrazioni in CI
  ancora rinviato (ADR 0007). Il loop OAuth reale locale (Inspector → DCR →
  consent) è documentato ma va provato una volta end-to-end.

## 2026-07-07 — Auth: da WorkOS AuthKit a Better Auth self-hosted (port su `main`)

- **Did:** portato il lavoro del branch `migrate-auth-to-better-auth` (commit
  `119be48`) su `main`, riapplicandolo file-per-file sopra l'evoluzione di `main`
  (sorgenti sotto `src/`, schemi dichiarativi, MCP con instructions/telemetry).
  Motivo: WorkOS costa ~$100/mese a traffico zero per la feature MCP/DCR, e
  l'identità in WorkOS lascia Supabase cieco lato utente. Due scostamenti dal
  branch: **solo magic link** (niente Google — nessun IdP esterno da configurare)
  e **tabelle Better Auth via schema dichiarativo** (non `@better-auth/cli
  migrate`), coerente con ADR 0007.
- **Changed:**
  - **Codice (`code/`):** deps (`better-auth`/`pg`/`resend` in, `@workos-inc/…`
    e `jose` out); `src/lib/auth.ts` + `auth-client.ts` + catch-all
    `api/auth/[...all]`; `/sign-in` + `/consent` (UI proprietarie) + stili
    `globals.css`; `src/proxy.ts` (guardia ottimistica `getSessionCookie`, solo
    `/account`); `account`/`upgrade`/`actions` letti via `auth.api.getSession`;
    MCP route verifica per **introspezione** (`getMcpSession`, token opachi)
    mantenendo `INSTRUCTIONS`; well-known protected-resource + nuovo
    authorization-server; `check-oauth.mjs` versione Better Auth; rinominato
    `workos_user_id` → `user_id` **ovunque** (billing gate/store/webhook +
    telemetry `tool_events`/`feedback` + tipi generati; Stripe metadata →
    `app_user_id`) — nessuna tabella conserva la chiave legacy; rimosso
    `src/app/auth/callback`.
  - **DB:** `supabase/schemas/01_billing.sql` rinominato; nuovo
    `03_auth.sql` (DDL Better Auth verbatim da `@better-auth/cli generate` +
    RLS zero-policy); migrazione `00004_better_auth_and_user_id.sql` (rename +
    tabelle auth), validata applicando l'intera catena su un Postgres usa-e-getta.
    Aggiunti anche i `grant … to service_role` espliciti su tutte e tre le
    tabelle (`users_billing`/`tool_events`/`feedback`, migrazione 00005), così un
    rebuild da migrazioni riproduce lo stato funzionante senza le default
    privileges della piattaforma.
    `db:types` da rigenerare col DB linkato.
  - **Brain:** nuova [ADR 0012](content/decisions/0012-mcp-auth-better-auth-self-hosted.md)
    (supersedes 0001, che ora punta a 0012); riscritti
    [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md) e
    [dev-setup-guide.md](content/knowledge/dev-setup-guide.md); aggiornato
    [billing-setup.md](content/knowledge/billing-setup.md); aggiornata la
    `CLAUDE.md` di compagnia (stack + billing); nuovo `.env.example`.
- **Follow-ups:** task umani (sez. C del piano): generare i segreti, `DATABASE_URL`
  session pooler, verificare il dominio Resend `dottcomm.dev`, `npm run db:push` +
  `db:types`, env su Vercel (aggiungi Better Auth, rimuovi WorkOS), riconnettere
  il connector Claude (DCR), poi **decommissionare WorkOS** (via i $100/mese). Il
  branch `migrate-auth-to-better-auth` può essere cancellato (contenuto superato).
  Aperti tecnici: enforcement degli scope in `withMcpAuth`; drift dello schema
  Better Auth agli upgrade (ri-`generate` + diff su `03_auth.sql`).

## 2026-07-07 — Landing: riposizionamento «estensione di Claude» + copy allineata ai tool

- **Did:** rilavorata la copy della landing partendo dai suggerimenti dell'utente,
  valutando ogni modifica a schermo (screenshot headless Chrome).
- **Changed:**
  - **Posizionamento hero:** rimossa la pill «commercialista × claude»; nuovo
    titolo **«L'estensione di Claude per i Commercialisti»** (accent terracotta su
    «Claude»); hero-sub e fine-print resi espliciti sul modello «aggiunge a Claude
    gli strumenti dello studio».
  - **Correzione feature (bug):** la sezione usi e una FAQ elencavano funzionalità
    inesistenti (*quadrature e riconciliazioni*, *LIPE ed esterometro*).
    Sostituite con capacità reali mappate su `tools.ts` (F24/acconti, solleciti,
    scadenzario, atti e cartelle, ravvedimento, lettura documenti).
  - **FAQ:** aggiunta «Cos'è DottComm?» (aperta di default) col posizionamento;
    precisato che lo stesso connettore funziona anche in **Claude Code** e
    **Claude Cowork**.
  - **Tipografia/UX:** rimossi i trattini lunghi `—` dalla copy IT (→ parentesi);
    più spazio tra «Prezzi» e il bottone in nav; freccia del closing-CTA girata in
    su (scrolla verso l'alto). Componente `Arrow` con prop `up`.
  - Nuovo doc vivo:
    [landing-posizionamento-copy.md](content/knowledge/landing-posizionamento-copy.md)
    (posizionamento + regola «la copy riflette gli strumenti reali» + convenzioni IT).
  - File: `code/src/app/page.tsx`, `code/src/components/FaqAccordion.tsx`,
    `code/src/app/globals.css`.
- **Follow-ups:** trattini `—` restano negli output dei tool MCP e nei `<title>`
  delle pagine legali (fuori scope «copy landing»); sweeppare se si vuole coerenza
  totale. Il mock chat dell'hero dice ancora «14 deleghe compilate e quadrate»
  (illustrativo, non un claim).

---

## 2026-07-07 — Estrazione scontrini → detrazione spese sanitarie (S13, via MCP)

- **Did:** costruita la capability per estrarre i dati da scontrini e fatture
  mediche di un contribuente e compilare il foglio della detrazione IRPEF delle
  spese sanitarie (730/Redditi PF). Ricerca su fonti ufficiali per diventare
  esperti del flusso reale e delle regole; verifica del calcolo e dello schema di
  estrazione sulle **istruzioni 730/2026** (periodo 2025). Corretta a metà strada
  la consegna: **servita via MCP** (tool gated + prompt-skill), non come
  `.claude/skills` di repo (un primo `estrai-scontrini` skill è stato rimosso).
  Fix di correttezza fiscale dopo verifica: franchigia **unica** sul pool E1+E2
  (non separata), **E25** trattato come deduzione (non 19%), rimborsi scorporati.
  Schema del foglio **configurabile** (param `colonne`, ricordato in `config.md`).
  116 test verdi, `src` typecheck pulito.
- **Changed:** [ADR 0012](content/decisions/0012-estrazione-scontrini-detrazione-sanitaria.md)
  (capability MCP S13, regole verificate, schema configurabile); nuovo doc
  [spese-sanitarie-detrazione](content/knowledge/spese-sanitarie-detrazione.md);
  codice: nuovo `code/src/lib/fiscal/detrazioni-sanitarie.ts` (+test), 6 costanti
  registrate in `constants.ts`, nuovo tool `code/src/lib/mcp/skills/detrazione-sanitaria.ts`
  registrato in `tools.ts`, nuovo prompt + estensione `convenzione_studio_db` in
  `prompts.ts`, casi e2e in `tools-e2e.test.ts`; aggiornato il
  [catalogo](content/brainstorms/catalogo-skills-tools.md) (stato build S13).
- **Follow-ups:** validazione col pilota (G-pilota); stima E2 = massimo teorico
  (manca l'incapienza del familiare); stato pluriennale rate E4/E5 e riporto E6
  non modellati; E25 solo segnalato, non calcolato nel reddito; scrittura diretta
  su Google Sheet via connettore.

---

## 2026-07-07 — Registro costanti fiscali: provenienza, vigenze, `/verifica-costanti`

- **Did:** deciso e implementato come mantenere le costanti a peso legale
  (input: la verifica di massa su fonti ufficiali fatta in altra sessione).
  Migrato `code/src/lib/fiscal/` al registro con provenienza
  (`{valore, fonte, verificatoIl}` + tabelle tempo-indicizzate via
  `lookupVigente`, nuovo `registry.ts`) e applicate le 5 divergenze trovate:
  tasso legale 2026 1,60% con pro-rata pluriennale, termini bonari 60/90 gg
  (D.Lgs. 108/2024), scaglioni ravvedimento b-bis/b-ter a trigger (D.Lgs.
  87/2024) con avvertenze per il pre-riforma, festività 4/10 dal 2026
  (L. 151/2025), rate AdER 84/96/108 per anno-istanza (D.Lgs. 110/2024).
  Bonus verificati: soglia ISA/forfettari €206 in `acconti.ts`, riduzione 2/3
  per esiti 36-ter in `termini.ts`/`triage_atto`. 97 test verdi.
- **Changed:** [ADR 0011](content/decisions/0011-registro-costanti-fiscali-provenienza.md)
  (registry in codice + skill di ri-verifica + regola del gate per i futuri
  calcolatori); nuova skill company-scoped
  `companies/dott-comm/.claude/skills/verifica-costanti/` (spostata dal
  livello group: vale la regola "prefer the narrower company scope");
  nuovo [manutenzione-costanti-fiscali](content/knowledge/manutenzione-costanti-fiscali.md)
  che SOSTITUISCE i due doc temporanei della verifica (eliminati:
  `knowledge/costanti-fiscali-verificate-2026.md`,
  `brainstorms/costanti-fiscali-da-allineare.md` — la provenienza ora vive nel
  codice); aggiornati `code/AGENTS.md` (convenzione registry) e il
  [catalogo](content/brainstorms/catalogo-skills-tools.md) (stato build).
- **Follow-ups:** ricontrollo conversione D.L. 89/2026 (~21/7) e tasso legale
  2024 mai riverificato; primo giro pieno di `/verifica-costanti` a dicembre
  2026; regime sanzionatorio pre-1/9/2024 non modellato (il motore avvisa);
  la famiglia calcolatori domande-spot ora ha il suo prerequisito — resta la
  scelta di quali costruire per primi.

## 2026-07-07 — Il test della giornata → i tre trigger quotidiani

- **Did:** analisi "test della giornata" (i tool attuali coprono 2 momenti su
  ~12 del quotidiano dello studio, nessuno giornaliero) e build delle priorità
  1–3 che ne derivano: `triage_atto`, `scadenze_cliente` + convenzione
  `studio/`, loop L1/L2 promossi a campagne sul portafoglio.
- **Changed:**
  - Brainstorm: [test-della-giornata-valore-quotidiano.md](content/brainstorms/test-della-giornata-valore-quotidiano.md)
    (audit onesto dei 5 tool, principio "un tool gated si guadagna il gate col
    determinismo a peso legale", inventario del lavoro ripetitivo, priorità).
  - Codice (`code/src/`): nuovi motori puri `lib/fiscal/calendario.ts`
    (festivi, Pasqua, slittamenti, conteggi con sospensioni), `termini.ts`
    (termini perentori per 6 tipi di atto: feriale, sospensione bonari,
    +90 gg adesione) e `adempimenti.ts` (attributi cliente → scadenzario);
    nuovi tool `triage_atto` e `scadenze_cliente`; `raccolta_documenti` e
    `comunica_versamenti` in forma campagna; nuovo prompt MCP
    `convenzione_studio_db`; costanti termini in `constants.ts` (tutte
    `DA VERIFICARE`). Verifica: 22 unit test nuovi + `tools-e2e.test.ts`
    attraverso il vero McpServer (80/80), tsc e lint puliti. Branch:
    `dott-comm/triage-scadenzario-campagne`.
  - Decisione: nuovo [ADR 0010](content/decisions/0010-convenzione-studio-db-client-local.md)
    (convenzione `studio/` client-local); indicizzati 0009 e 0010 nel
    [README delle decisioni](content/decisions/README.md).
  - Doc vivi: [mcp-user-guide.md](content/knowledge/mcp-user-guide.md)
    (sezione placeholder → elenco capability reali),
    [catalogo-skills-tools.md](content/brainstorms/catalogo-skills-tools.md)
    (stato build aggiornato), [`code/AGENTS.md`](code/AGENTS.md) (bullet ADR
    0003 esteso con la convenzione `studio/`).
- **Follow-ups:**
  - Allineare `constants.ts` ai valori verificati
    ([costanti-fiscali-da-allineare](content/brainstorms/costanti-fiscali-da-allineare.md),
    da sessione parallela — include le nuove costanti termini).
  - Decidere sulla famiglia calcolatori domande-spot (proposta in chiusura di
    sessione: `simula_forfettario` e `dividendi_vs_compenso` gated,
    `deducibilita` come prompt ungated, costo-dipendente rinviato).
  - Validare la convenzione `studio/` al gate G-pilota (ADR 0010).

---

## 2026-07-07 — Codice di produzione sotto `src/`
- **Did:** riorganizzata la root di `code/` spostando il sorgente di produzione
  (`app/`, `components/`, `lib/`, `proxy.ts`) sotto `src/`, per separarlo da
  config, tooling e generati man mano che le LOC crescono. `git mv` per preservare
  la history.
- **Changed:**
  - Codice/config: `git mv` in `src/`; `tsconfig.json` (`@/*` → `./src/*`),
    `vitest.config.ts` (alias `@` → `./src`), `package.json` (`db:types` →
    `src/lib/billing/database.types.ts`). Verificato: `npm run build` (con
    `src/proxy.ts` rilevato come Middleware) e `npm run test` 52/52 passano.
  - Decisione: nuovo [ADR 0009](content/decisions/0009-prod-source-under-src.md).
  - Doc vivi aggiornati a `src/…`: [`code/AGENTS.md`](code/AGENTS.md) (nuovo bullet
    sulla struttura), [CLAUDE.md](CLAUDE.md),
    [billing-setup.md](content/knowledge/billing-setup.md),
    [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md),
    [db-schema-migrations.md](content/knowledge/db-schema-migrations.md),
    [cuneo-20-luglio-build.md](content/knowledge/cuneo-20-luglio-build.md).
  - ADR storici (0001/0003/0005/0007) lasciati com'erano: citano i path pre-`src/`
    per regola "non si riscrive la storia".
- **Follow-ups:** nessuno.

---

## 2026-07-07 — Redesign della landing page (import da Claude Design)
- **Did:** implementato il redesign `DottComm.dc.html` importato dal progetto
  Claude Design "DottComm website redesign" (via MCP `claude_design`). La landing
  passa da una pagina snella (hero chiaro + 3 step + CTA) a una struttura completa:
  hero scuro a due colonne con mockup chat fluttuante e stat card, griglia **6 casi
  d'uso**, i 3 step invariati nella sostanza (step 2 a colonne invertite),
  **testimonianze** (3), **prezzi** (Free / Premium €98 / Su misura, sezione scura),
  **FAQ** ad accordion (6 voci) e closing CTA scura. Copy e sezioni fedeli al design.
- **Changed:**
  - Codice (nessun documento del brain): riscritti `code/app/page.tsx` e
    `code/app/globals.css` (nuovi token dark: `--dark/--dark-2/--on-dark/--line-dark`,
    `--claude`; content max-width 1120px); aggiornato `code/app/layout.tsx` (metadata)
    e `code/components/SiteFooter.tsx` (layout a tre blocchi + link `/#usi`,`/#prezzi`).
    Nuovi client component `code/components/ScrollLink.tsx` (smooth-scroll agli anchor)
    e `code/components/FaqAccordion.tsx`. Riusati `CopyPromptButton`,
    `CopyConnectorButton`, `AGENT_PROMPT`/`CONNECTOR_URL` da `lib/prompt.ts` (fonte
    canonica del prompt — il design ne aveva una copia più corta, ignorata).
  - Asset (`public/logo.svg`,`claude-logo.svg`,`deco.svg`) già identici al design:
    nessuna modifica.
  - Verificato: `next dev` compila pulito, home + `/privacy` + `/termini` HTTP 200,
    screenshot headless di tutte le sezioni fedeli al mock.
  - **Prezzi reali (non mock):** Free / Premium €98/mese / Su misura è il modello
    effettivo. Documentato in [content/decisions/0008-listino-pubblico-packaging.md](content/decisions/0008-listino-pubblico-packaging.md)
    (estende ADR 0002: Free = trial, Premium = stato `active`/`STRIPE_PRICE_ID`,
    Su misura = vendita) + sezione "Public pricing" in
    [content/knowledge/billing-setup.md](content/knowledge/billing-setup.md).
  - **Lint:** corretto `code/components/StartButton.tsx` (`<a href="/#…">` → `<Link>`,
    regola `no-html-link-for-pages`); `eslint app components` ora pulito.
  - **Bugfix footer:** i link "Cosa fa"/"Prezzi" del footer erano `<Link href="/#…">`
    puri → funzionavano solo al primo click (col hash già in URL il browser non
    riscrolla). Ora usano `ScrollLink`, che fa `scrollIntoView` a ogni click (stesso
    meccanismo dei bottoni della pagina). `ScrollLink` ora renderizza un `<Link>`
    (fallback client-side cross-pagina + niente warning lint).
  - **Nav:** aggiunti link testuali "Cosa fa" (#usi) e "Prezzi" (#prezzi) nel
    `SiteNav` — testo discreto, non bottoni outline, così l'unica CTA piena resta
    dominante; nascosti sotto 640px.
- **Follow-ups:** copy testimonianze ancora illustrativa (nessun utente reale).
  Su misura senza percorso self-serve (canale commerciale). Se il prezzo cambia,
  tenere in sync landing + ADR 0008 + `STRIPE_PRICE_ID`.

## 2026-07-07 — Schema dichiarativo + migrazioni via Supabase CLI (fine del SQL editor a mano)
- **Did:** risolto il problema devex "le migrazioni vanno incollate a mano nel SQL
  editor di Supabase" e la mancanza di una fonte di verità per lo schema (per
  sapere `increment_usage` bisognava rieseguire mentalmente 00001+00002). Scelta,
  su modello SQLAlchemy+Alembic: **declarative schemas** della Supabase CLI —
  `supabase/schemas/*.sql` come fonte di verità, migrazioni *derivate* con
  `db diff`, applicate con `db push`. Gate di applicazione **manuale**, niente CI
  per ora (scelta dell'utente). Scartati Drizzle/Prisma (ORM runtime non
  giustificato per uno store di 4 tabelle vincolato dall'ADR 0003; plpgsql/RLS
  sono nativi in SQL) e il runner fatto in casa.
- **Changed:**
  - Codice: `code/supabase/config.toml` + `schemas/01_billing.sql` +
    `schemas/02_telemetry.sql` (end-state ricostruito dalle 3 migration, immutate);
    `code/package.json` (CLI come devDependency + script `db:diff/push/new/lint/types`);
    `code/lib/billing/database.types.ts` (tipi generati, seed a mano) e client
    `code/lib/billing/supabase.ts` tipizzato `SupabaseClient<Database>` (+ fix del
    tipo di `patch` in `store.ts`). `npm run test` verde (52), tsc pulito (a parte
    artefatti stale in `.next/`).
  - Brain: nuovo [ADR 0007](content/decisions/0007-declarative-schema-cli-migrations.md);
    nuovo runbook [db-schema-migrations.md](content/knowledge/db-schema-migrations.md);
    aggiornati [dev-setup-guide.md](content/knowledge/dev-setup-guide.md) e
    [billing-setup.md](content/knowledge/billing-setup.md) (via SQL editor → CLI);
    regola su schema-changes in `code/AGENTS.md`; indice `decisions/README.md`
    (aggiunti anche 0004–0006 che mancavano).
- **Follow-ups:** `supabase link` + **baseline** (`migration repair --status
  applied 00001 00002 00003`) su dev e prod prima del primo `db push`; primo
  `npm run db:types` su progetto collegato per canonicalizzare i tipi; **CI**
  auto-apply su merge in main da valutare quando il flusso manuale sarà rodato.

## 2026-07-07 — Trial gate: da 50 totali a "50 upfront, poi 20/giorno"
- **Did:** rivisto il paywall trial. Prima: cap fisso di 50 chiamate lifetime,
  poi blocco definitivo. Ora: le prime 50 (pool `TRIAL_TOOL_CALL_LIMIT`) restano
  usabili a qualsiasi ritmo; esaurite, l'utente passa a un'allowance giornaliera
  ricorrente di 20 (`DAILY_TOOL_CALL_LIMIT`) che si azzera a **mezzanotte
  Europe/Rome**. Messaggio di blocco giornaliero: "hai raggiunto il limite
  giornaliero… torna domani, oppure abbonati". Modello e reset scelti
  esplicitamente dall'utente.
- **Changed:** nuova migration `code/supabase/migrations/00002_daily_usage.sql`
  (colonne `daily_usage_count`/`daily_usage_date` Rome-local + `increment_usage`
  rifatta col reset giornaliero); `code/lib/billing/gate.ts` (`decide` a due fasi,
  `getDailyLimit`/`getTrialLimits`, campi `dailyUsageCount`/`dailyLimit` su
  `GateDecision`, `getBillingRow` legge le nuove colonne); pagine `code/app/
  {upgrade,account}/page.tsx` mostrano l'allowance del giorno in fase 2 invece di
  un fuorviante 50/50; nuovi test `code/lib/billing/__tests__/gate.test.ts` (10);
  aggiornato [billing-setup.md](content/knowledge/billing-setup.md).
- **Follow-ups:** ADR 0002 dice ancora "free trial = tool-call count" senza il
  daily — valutare se registrarne la revisione con un ADR quando il modello si
  stabilizza. Migration 00002 va eseguita in Supabase (SQL Editor) al deploy.

## 2026-07-07 — Feedback & telemetria: il modello come raccoglitore di segnale
- **Did:** risolto il problema "l'utente MCP non può darci feedback": (layer 1)
  telemetria per-chiamata al chokepoint `registerGatedTool` → tabella
  `tool_events` (tool, esito ok/error/blocked, latenza, **soli nomi** degli
  argomenti, fail-open); (layer 2) tool ungated `invia_feedback` → tabella
  `feedback` + `instructions` a livello server che istruiscono il modello a
  proporre la segnalazione quando rileva bisogni non soddisfatti (col consenso
  dell'utente, senza dati dei clienti). Layer 3 (cron di prioritizzazione)
  rimandato — questa è la base dati che lo alimenterà.
- **Changed:** nuova [ADR 0006](content/decisions/0006-telemetry-feedback-supabase.md)
  (estende ADR 0003: Supabase = billing + segnale di prodotto, mai dati fiscali);
  `code/supabase/migrations/00003_telemetry_feedback.sql`; nuovi
  `code/lib/mcp/telemetry.ts` e `code/lib/mcp/feedback.ts`;
  `register-gated-tool.ts` (telemetria + `resolveUserId` estratto), `tools.ts`,
  `route.ts` (instructions); alias `@` in `vitest.config.ts`; 14 nuovi test;
  `code/AGENTS.md` (eccezione ungated); `code/legal/privacy-policy.md`
  (telemetria + feedback — **da far rivedere**). Verificato end-to-end in dev:
  instructions avvertite, tool ok/blocked/feedback, fail-open con tabelle mancanti.
- **Follow-ups:** applicare la migration 00003 su Supabase dev e prod (SQL
  Editor, dopo la 00002 del trial giornaliero); revisione legale dell'informativa; layer 3 (cron mattutino di
  clustering + prioritizzazione per frizione esterna); valutare cattura dei
  fallimenti di validazione Zod (avvengono nell'SDK prima del wrapper).

## 2026-07-07 — Paywall: link con token firmato → checkout senza re-login
- **Did:** eliminato il re-login AuthKit nel percorso paywall → pagamento. Il
  server MCP conosce già l'utente (JWT verificato), quindi firma un token di
  breve durata (`{sub,exp}`, HMAC-SHA256, TTL 15 min) e lo mette nel link
  `/upgrade?t=…`; la pagina lo verifica e manda dritto a Stripe Checkout.
- **Changed:** nuovo `code/lib/billing/upgrade-token.ts` (+ test) con
  `sign/verifyUpgradeToken`; `code/lib/billing/gate.ts` (`upgradeUrl(userId)` +
  propagazione `userId` in `decide`/`checkAndRecordUsage`, default dominio
  allineato a `www.dottcomm.dev`); `code/app/upgrade/actions.ts` (`startCheckout`
  accetta il token) e `code/app/upgrade/page.tsx` (CTA checkout senza gate di
  login). Aggiunti `vitest.config.ts` + stub `server-only` per testare moduli
  server. Nuova [ADR 0005](content/decisions/0005-paywall-signed-token-checkout.md);
  documentato `UPGRADE_TOKEN_SECRET` in `.env.example`.
- **Follow-ups:** il **portale clienti** resta dietro login completo (per
  scelta di sicurezza — token solo-checkout); gestire/ruotare
  `UPGRADE_TOKEN_SECRET`.

## 2026-07-07 — Onboarding: connettore GUI dell'app Claude + prompt con auto-controllo
- **Did:** chiarito come un utente **non tecnico** dell'**app desktop Claude**
  attiva davvero DottComm. Ricerca su docs Anthropic + guida Claude Code: sul
  desktop i server MCP remoti si aggiungono dalla **GUI Connettori**, non da un
  prompt; **non esiste** un "Add to Claude" / deep-link web per i connettori
  remoti personalizzati (solo la Connectors Directory, previa submission); la
  scheda Code integrata usa un archivio config separato dalla chat. Rifatto il
  flusso del sito di conseguenza.
- **Changed:**
  - Nuovo [ADR 0004](content/decisions/0004-onboarding-claude-connector-gui.md) —
    installazione via connettore GUI (2 azioni: collega una volta, poi usa il
    prompt in chat); alternative scartate (auto-install `claude mcp add`,
    deep-link, bundle `.mcpb`).
  - Aggiornata [content/knowledge/mcp-user-guide.md](content/knowledge/mcp-user-guide.md):
    flusso concreto + → Connettori con URL reale `https://www.dottcomm.dev/api/mcp`,
    nota su auto-controllo del prompt e caveat tenant AuthKit staging.
  - Sito (`code/`): landing riscritta (rinominato "Claude Code" → **Claude**;
    step 02 = collega il connettore con pulsante **Copia URL connettore** che
    mostra l'URL con icona→spunta; step 03 = **Copia il prompt**; CTA hero/nav
    ora **scrollano** a `#installazione`); `lib/prompt.ts` — `CONNECTOR_URL`
    unica fonte + `AGENT_PROMPT` con **auto-controllo**: se gli strumenti
    DottComm non ci sono, Claude si ferma e guida, senza inventare risposte
    fiscali. Nuovi componenti `StartButton`, `CopyConnectorButton`.
- **Follow-ups:** sostituire il tenant AuthKit **staging**
  (`sensible-coral-42-staging.authkit.app`) con produzione prima del lancio;
  valutare submission alla **Connectors Directory** per il vero one-click;
  aggiungere screenshot alla guida utente; mantenere l'invariante
  `CONNECTOR_URL == MCP_RESOURCE_URL`.

## 2026-07-07 — Vercel: fissato il Root Directory per il monorepo
- **Did:** collegato il repo GitHub a Vercel per i deploy automatici; fallivano
  perché l'app non è alla root del repo ma in `companies/dott-comm/code/`
  (monorepo company-of-companies). Fix: impostare **Root Directory** =
  `companies/dott-comm/code` nelle impostazioni del progetto Vercel (Settings →
  Build & Deployment). Confermato che un `vercel.json` alla root NON può
  rilocare il root — è solo un'impostazione dashboard. Deploy poi riuscito.
- **Changed:** riscritto lo step 1 (Vercel) di
  [dev-setup-guide.md](content/knowledge/dev-setup-guide.md) con l'avviso "app
  non alla root" e i due percorsi (GitHub auto-deploy via Root Directory; CLI da
  dentro `code/`).
- **Follow-ups:** nessuno; quando il dominio prod è definitivo, fissarlo nei doc
  al posto degli esempi `dott-comm.vercel.app` (già annotato).

## 2026-07-07 — Track A: costruito il cuneo del 20 luglio (L1→S7→S12→L2)
- **Did:** implementato e verificato end-to-end il cuneo del 20 luglio nel server
  MCP (`code/`): rules engine fiscale puro + 5 capability + 2 MCP prompt, a
  partire dal [piano approvato](../../).
- **Changed:**
  - **Codice** (`code/`): nuovo `lib/fiscal/` (acconti, rateazione, f24-codici,
    ravvedimento, constants, money) e `lib/parse/it-formats.ts` — funzioni pure,
    23 unit test vitest. Nuove capability MCP in `lib/mcp/skills/`
    (`prospetto_acconti` S12, `estrai_documenti` S7, `ravvedimento` S9),
    `lib/mcp/loops/` (`raccolta_documenti` L1, `comunica_versamenti` L2),
    `lib/mcp/prompts.ts` (2 prompt). `register-gated-tool.ts` estratto;
    `tools.ts` ora è un composer; rimossi i 2 placeholder. `package.json`:
    aggiunto vitest + script `test`. `AGENTS.md`: sezione MCP capabilities.
  - **Decisione:** nuovo [ADR 0003](content/decisions/0003-track-a-stateless-client-local-state.md)
    — Track A senza stato di dominio server-side, stato client-local, `studio-db`
    riformulato come convenzione (non DB); GDPR ≈ zero. Log ADR aggiornato (aggiunti
    0002 e 0003, prima mancanti).
  - **Knowledge:** nuovo [cuneo-20-luglio-build.md](content/knowledge/cuneo-20-luglio-build.md).
  - **Brainstorm:** [catalogo-skills-tools.md](content/brainstorms/catalogo-skills-tools.md)
    — T1 riformulato client-local + sezione "Stato build".
- **Follow-ups:**
  - **Validare le costanti fiscali `DA VERIFICARE`** con un professionista prima
    dell'uso reale (split ISA 50/50, sanzione 25%, tasso legale, codici F24) —
    gate G-pilota.
  - Definire la convenzione file di `studio/` (roster, scadenzario, raccolta,
    comunicazioni.log) col primo pilota.
  - Resto di Track A: skill S1–S6/S8/S10/S11, watchdog W2/W3.
  - Notato in verifica: dev server orfani su porte diverse causano confusione —
    killare i `next dev` prima di testare.

---

## 2026-07-07 — Marketing: campagna crunch 20/7 + video ad "ninja commercialista"
- **Did:** first comms/marketing exploration for Dott. Comm. Framed the two hard
  constraints (2-week seasonal window to 20/7; product still mostly placeholder →
  keep the ad's promise emotional, not specific). Established the audience insight
  that decides everything — commercialisti are liability-bearing, data-paranoid and
  peer-driven, so **peer proof beats polish** and a slick video from a no-follower
  account reads as *more* suspicious. Ranked channels (referrals/peer proof #1;
  community-seeded social; video ad; category infrastructure for next cycle). User
  chose **video-ad-first, warm network second**; agreed to mine 2–3 real stressed
  commercialisti as research so the ad doesn't read as AI slop.
- **Changed:** new brainstorm
  [content/brainstorms/marketing-crunch-20-luglio.md](content/brainstorms/marketing-crunch-20-luglio.md)
  (audience insight, channel ranking, the "ninja commercialista" concept, decision).
  A full Veo/Gemini production guide (`dottcomm-video-ad-guide.md`) was written to
  the user's **Downloads folder — outside this repo**, so it's referenced but not
  tracked here.
- **Follow-ups:** distribution is unsolved (zero followers = ~zero organic reach →
  needs small paid targeting on "Dottore Commercialista" + community seeding, budget
  TBD); ensure dottcomm.dev doesn't contradict the ad's implied relief on click-through;
  decide whether the video lands on a dedicated capture page vs the current homepage;
  activate the warm network (research calls + outreach message) after the video. User
  is generating the clips in Gemini now.

## 2026-07-07 — Dev setup guide: checklist unica per Vercel/WorkOS/Supabase/Stripe
- **Did:** constatato che i passi manuali di setup erano sparsi tra due runbook
  (auth e billing) e che mancava del tutto la parte Vercel (progetto mai
  linkato, `.vercel/` assente): consolidata una guida dev unica, ordinata come
  checklist — prima Vercel perché il dominio di produzione determina audience
  del token, redirect URI, webhook URL e link di upgrade — con tabella env
  finale, verifica end-to-end e una sezione "when something breaks".
- **Changed:** nuovo [dev-setup-guide.md](content/knowledge/dev-setup-guide.md);
  cross-link (e bump `updated:`) in
  [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md) e
  [billing-setup.md](content/knowledge/billing-setup.md), che restano i deep
  dive per layer.
- **Follow-ups:** eseguire davvero la checklist (è il lavoro esterno rimasto
  dalla sessione paywall); quando il dominio prod è definitivo, fissarlo nei
  doc al posto degli esempi `dott-comm.vercel.app`.

## 2026-07-06 — Paywall MCP: gate Supabase a consumo + Stripe
- **Did:** progettato e costruito il layer di monetizzazione dell'MCP. Identità
  in WorkOS, soldi in Stripe, entitlement + contatore d'uso in Supabase; prova
  gratuita a **numero di tool call** (default 50, `TRIAL_TOOL_CALL_LIMIT`); a
  limite raggiunto le tool call rispondono in-band con messaggio di upgrade +
  link (mai 401/403); piano pagato = abbonamento mensile flat illimitato. Il
  gate legge il DB a ogni chiamata, così il webhook Stripe sblocca la chiamata
  successiva. Fail closed su errori DB. Leg di pagamento sul sito: `/upgrade`
  con sessione AuthKit (stesso env WorkOS → stesso user id) → Stripe Checkout;
  `/account` → Customer Portal.
- **Changed:**
  - Decisione: [ADR 0002](content/decisions/0002-billing-supabase-stripe-usage-trial.md) (accepted).
  - Codice (`code/`): `supabase/migrations/00001_users_billing.sql` (tabella +
    RPC `increment_usage` atomica), `lib/billing/{supabase,gate,store}.ts`,
    `lib/mcp/tools.ts` (wrapper `registerGatedTool`), `proxy.ts` (AuthKit,
    matcher allowlist), `app/auth/callback/route.ts`,
    `app/upgrade/{page,actions,success/page}`, `app/account/page.tsx`,
    `lib/stripe.ts`, `app/api/stripe/webhook/route.ts`, CSS billing in
    `globals.css`, `components/BillingShell.tsx`, `.env.example`; dipendenze
    `@supabase/supabase-js`, `stripe`, `@workos-inc/authkit-nextjs`, `server-only`.
  - Knowledge: nuovo [billing-setup.md](content/knowledge/billing-setup.md)
    (runbook + gotchas); cross-link in [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md).
  - Convenzione billing aggiunta al [CLAUDE.md](CLAUDE.md) di scope (nuovi tool
    → sempre via `registerGatedTool`).
- **Verificato:** `next build` + lint puliti; fail-closed reale (Supabase
  irraggiungibile → messaggio cortese, tool non eseguito); path dev ungated OK;
  proxy NON intercetta `/api/mcp` né `/.well-known/*`; `/account` da sloggato →
  307 all'authorize WorkOS con PKCE; webhook con firma finta → 400;
  `/upgrade/success` statica OK. Gotcha Next 16/authkit 4.x scoperto e risolto:
  `getSignInUrl`/`ensureSignedIn` scrivono un cookie PKCE → vietati nel render;
  sign-in via server action e protezione via `middlewareAuth` del proxy.
- **Follow-ups:** setup esterno da fare a mano — progetto Supabase (+ eseguire
  la migration), prodotto/prezzo + webhook + Customer Portal su Stripe (test
  mode), redirect URI su WorkOS, env su Vercel. Poi il test end-to-end
  pagamenti con `stripe listen` + carta 4242 (passi in billing-setup.md).
  Contatore mensile/cap sul piano pagato se il pricing evolve.

## 2026-07-06 — Legal pages (privacy + termini) & abstract violet hero/CTA
- **Did:** wrote the two legal docs Stripe requires (Privacy Policy + Terms &
  Conditions, in Italian, GDPR-shaped, single contact `info@dottcomm.dev`),
  built them as real Next.js routes, and reworked the hero + closing CTA visuals.
- **Changed:** added `code/legal/` (source-of-truth Markdown + a README telling
  the deployer the pages are already wired and must go live before Stripe
  checkout); new routes `code/app/privacy/page.tsx` and `code/app/termini/page.tsx`;
  extracted `code/components/SiteNav.tsx` + `SiteFooter.tsx` (footer now carries
  the legal links on every page) and refactored `code/app/page.tsx` to use them.
- **Hero/CTA redesign (iterated with the user):** started from an oxygen-agent.com
  reference and went through several rounds — animated CSS aurora → real snowy
  landscape photo → naive hand-drawn violet mountains → **final: a clean, full-bleed
  white hero and CTA with abstract violet line-art scattered at the edges.** The
  old dark "stage" tiles are gone; both sections are now plain white with dark-ink
  text. The decoration is one shared asset `code/public/deco.svg` (thin monoline
  curves, concentric rings, dashed arcs, dots, ticks — no wobble filter), rendered
  as a `.deco` layer that is radial-masked out of the center so text stays clean,
  with a slow 30s drift disabled under `prefers-reduced-motion`.
- **Follow-ups:** legal copy references paid plans / Stripe checkout but the site
  is still a free "copy the prompt" page — keep pages live + registered in Stripe
  before monetizing. **Not yet deployed to Vercel** (this session pushes to GitHub
  for review only).

## 2026-07-06 — MCP server scaffold nell'app Next.js + auth WorkOS AuthKit
- **Did:** deciso e realizzato dove vive il server MCP e come autentica. Serve
  l'MCP dallo stesso app Next.js del sito (route handler `mcp-handler`,
  `/api/mcp`), deployabile su Vercel nello stesso progetto; auth OAuth 2.1 con
  WorkOS AuthKit come Authorization Server (il server è solo Resource Server:
  verifica il JWT contro il JWKS di AuthKit con `jose`). Scaffold con due
  capability **placeholder** (uno skill, un tool/connettore) esplicitamente
  marcate `⚠️ PLACEHOLDER — NOT IMPLEMENTED`.
- **Changed:**
  - Codice (`code/`): `app/api/[transport]/route.ts`, `lib/mcp/tools.ts`,
    `app/.well-known/oauth-protected-resource/route.ts`, `.env.example`
    (+ `!.env.example` in `.gitignore`); dipendenze `mcp-handler`, `zod`, `jose`.
  - Decisione: [ADR 0001](content/decisions/0001-mcp-in-nextjs-app-workos-auth.md) (accepted).
  - Knowledge: [mcp-auth-setup.md](content/knowledge/mcp-auth-setup.md) (dev/runbook)
    e [mcp-user-guide.md](content/knowledge/mcp-user-guide.md) (bozza utente).
  - Convenzione stack aggiunta al [CLAUDE.md](CLAUDE.md) di scope.
- **Verificato:** `tsc` e `next build` puliti; auth OFF → tools list/call OK;
  auth ON (build di prova) → 401 con `WWW-Authenticate: … resource_metadata=…`,
  token fasullo → 401, metadata espone il dominio AuthKit.
- **Follow-ups:** completare il setup WorkOS Dashboard + env su Vercel (Resource
  Indicator, DCR); definire ed enforce-are gli **scope** in `withMcpAuth`;
  sostituire i placeholder con skill/tool reali dal catalogo; valutare Fluid
  compute; completare la guida utente (URL/nome prodotto, metodi di login,
  screenshot, FAQ privacy).

## 2026-07-07 — Marketing site: single-agent focus + visual onboarding guide
- **Did:** several rounds of feedback-driven iteration on the landing page:
  narrowed the hero from a multi-agent rolling reel down to a single static
  "Claude Code" mention (the product only targets Claude Code for now); pushed
  CTA copy to explicit "copia e incollalo su Claude Code" everywhere; rewrote
  the mid-page section from an abstract "how the agent works" explainer into a
  literal getting-started walkthrough (download the app + create an account →
  open the Code tab and paste the prompt → talk to it), aimed at people who've
  never touched Claude before.
- **Changed:** `code/components/AgentReel.tsx` removed; `code/app/page.tsx` +
  `code/app/globals.css` rebuilt the getting-started section as three
  alternating rows, each with a bigger number badge and a hand-built visual
  mockup (download card, app-with-Code-tab-active card, chat-conversation
  card). `code/public/claude-logo.svg` added — the real Claude sunburst mark
  (Simple Icons, official brand orange), used in the download mockup; step 1
  now links to the verified real `https://claude.ai/download`.
- **Follow-ups:** same as before — copy is still illustrative, not yet
  grounded in [content/knowledge/problem-space.md](content/knowledge/problem-space.md)
  or the capability catalog; no real testimonials yet; still not deployed to
  Vercel (linked but never shipped).

## 2026-07-06 — Catalogo skills & tools (v1 → v2, allineato al problem-space e al wedge)
- **Did:** sessione di esplorazione partita da "cosa fa un commercialista e cosa
  automatizzare": prima stesura del catalogo capability per l'MCP, poi verifica
  di allineamento contro [content/knowledge/problem-space.md](content/knowledge/problem-space.md)
  e riscrittura completa (v2), ricalibrata per la software factory autonoma e
  infine allineata al capitolo Focus sul crunch del 20 luglio.
- **Changed:** creato e riscritto
  [content/brainstorms/catalogo-skills-tools.md](content/brainstorms/catalogo-skills-tools.md):
  7 principi di design (non competere col gestionale; l'area 09 è il fossato;
  campagne, non task; build ≈ zero → priorità per valore/attrito esterno);
  4 categorie — 12 Skills, 4 Loops, 5 Watchdogs, 8 Tools con `studio-db`
  keystone; sequenza a gate (G-pilota / G-accessi / G-partnership) con la
  catena del cuneo 20/7 (L1→S7→S12→L2) come campagna 0. Aggiunta la
  convenzione "era autonoma" al [CLAUDE.md](CLAUDE.md) di scope.
- **Follow-ups:** quando l'impostazione si consolida, tre ADR candidati
  (tassonomia a 4 categorie; `studio-db` keystone; prioritizzazione
  valore/attrito). Verificare che il codice in `code/` (app/api/, lib/mcp/,
  non committato) implementi la catena del cuneo nell'ordine di dipendenza.
  Open questions vive nel catalogo: deploy locale vs cloud, pattern
  bozza→revisione→firma con audit trail, studio pilota da reclutare.

## 2026-07-06 — Focus chapter: the 20 luglio 2026 versamenti crunch
- **Did:** added a time-bound focus to the problem space: D.L. 89/2026 prorogated
  saldo 2025 + primo acconto 2026 to 20/7/2026 (20/8 with +0,80%) for soggetti ISA,
  forfettari, and soci of trasparenza entities — a two-week, portfolio-wide crunch
  happening right now. Rules verified with a single web check as agreed (the rest
  of the doc stays knowledge-based).
- **Changed:** appended the "Focus — La corsa al 20 luglio 2026" chapter to
  [content/knowledge/problem-space.md](content/knowledge/problem-space.md): the
  event, why it crushes studios, and six priority Agent Skills ranked (perimeter
  classifier, campaign orchestrator on the scadenzario, F24 builder & dispatch
  loop, acconto/rateizzazione simulator, first-line question deflector,
  late-payer recovery).
- **Follow-ups:** the six Skills are the seed of the build-order ranking; the same
  campaign engine re-parameterizes for 30/11 secondo acconto and every versamenti
  peak. Marketing angle ("we take the 20 luglio off your back") worth wiring into
  the landing page copy.

## 2026-07-06 — Focus chapter: sealed the Tier-0 wedge + tools
- **Did:** refined the 20/7 focus into an explicit **most-urgent minimum set**,
  elevating the trivial-but-blocking upstream work the deadline forces (client-data
  completeness checks + solleciti, and data import/extraction) ahead of the
  calculator and comms drafter. Verified 2026 rateizzazione (max 7 rate to 16/12,
  4% annual) and acconto (storico 100% RN34 split 40/60; previsionale 20% tolerance,
  30% sanzione) with two targeted web checks.
- **Changed:** [content/knowledge/problem-space.md](content/knowledge/problem-space.md)
  — added a "Collect & verify inputs" + "Import & extract" step to the workload
  list; replaced the flat 6-Skill list with **Tier 0 (wedge)** = completeness check,
  import/extraction, prospetto calculator, comms drafter — plus a **Tools &
  integrations** table separating zero/low-integration wedge tools (document
  ingestion + messaging channel) from the Tier-1 deeper connectors (gestionale MCP,
  Entratel, cassetto fiscale). Reframed the product note around the wedge→flywheel.
- **Follow-ups:** Tier-0 chain (collect → extract → compute → communicate) is the
  concrete build order; first target = the prospetto calculator with paste-in F24
  input (Skill 2 depends on it). Consider an ADR to lock the wedge scope.

## 2026-07-06 — Marketing site ported to Next.js
- **Did:** copy pass on the landing page (new headline "Lo studio del futuro
  grazie a [agent]", two-line subtitle, dropped the hero eyebrow, CTA copy
  simplified to "Copia il prompt" everywhere, flow-step copy tweak, footer
  email → info@dottcomm.dev), then converted the whole thing from a
  self-contained `index.html` into a proper Next.js 16 App Router project so
  it's Vercel-deployable.
- **Changed:** `code/` is now a Next.js app (`package.json`, `app/layout.tsx`,
  `app/page.tsx`, `app/globals.css`, `components/AgentReel.tsx`,
  `components/CopyPromptButton.tsx`, `components/ScrollRevealInit.tsx`,
  `lib/prompt.ts`, `public/logo.svg`) — scaffolded with `create-next-app`,
  fonts moved to `next/font/google` (self-hosted, no more Google Fonts CDN
  link tags), logo moved to `next/image`. Verified with `npm run build`,
  `npm run lint` (both clean) and a local `npm run dev` pass in the browser.
  Old standalone `index.html` + `website/` removed.
- **Follow-ups:** not yet linked to a Vercel project or deployed — deliberately
  held off on running `vercel link`/`vercel deploy` pending explicit go-ahead,
  since that touches the user's live Vercel account. No favicon yet. Copy is
  still illustrative, not grounded in
  [content/knowledge/problem-space.md](content/knowledge/problem-space.md).

## 2026-07-06 — Ricerca: gestionali per studi commercialisti e API
- **Did:** ricerca approfondita (fan-out + verifica avversariale) su quali
  gestionali usano di più gli studi commercialisti in Italia e quali espongono
  API pubbliche utilizzabili per un MCP; poi integrata con un MCP open source
  già esistente segnalato dall'utente.
- **Changed:** nuovo brainstorm
  `content/brainstorms/gestionali-mercato-e-api.md`; aggiornata la open
  question sulle API in `content/brainstorms/catalogo-skills-tools.md`.
- **Trovato:** nessuna fonte pubblica con quote di mercato esatte. Fatture in
  Cloud (gruppo TeamSystem) ha API pubbliche solide (v2 REST + SDK) e un MCP
  open source già funzionante ([aringad/fattureincloud-mcp](https://github.com/aringad/fattureincloud-mcp),
  23 tool, MIT); TeamSystem Studio, Zucchetti Ago/Infinity, Passepartout,
  Sistemi STUDIO non hanno API pubbliche (o non sono verificabili
  pubblicamente).
- **Follow-ups:** valutare fork/riuso di `fattureincloud-mcp` per T2 invece di
  costruire da zero; verificare `development.teamsystem.com` con richiesta
  diretta al vendor; approfondire Wolters Kluwer/Buffetti/Namirial/Datalog se
  emergono come gestionale prevalente in uno studio pilota.

## 2026-07-06 — Marketing landing page, first draft
- **Did:** drafted the public landing page (single self-contained `index.html`):
  hero with a rotating-name headline (Claude Code / Codex / Hermes / OpenClaw),
  a plain "copy and paste into your agent" CTA (repeated in nav/hero/closing),
  a short capisce/esegue/verifica flow section, and a new "D" monogram logo.
  Iterated through several rounds of visual direction (an early denied.dev-style
  gradient look, then a Jet HR/Fiscozen/TeamSystem-influenced version with an
  ornate circular "stamp" CTA, now simplified to a plain flashy button per
  feedback) before landing here.
- **Changed:** created `code/index.html` and `code/website/logo.svg` (moved in
  from a standalone scratch folder outside this repo now that the company has
  its proper `code/` scope).
- **Follow-ups:** copy is still illustrative, not grounded in
  [content/knowledge/problem-space.md](content/knowledge/problem-space.md) yet —
  worth revisiting hero/flow copy against the real activity map once the product
  scope narrows. No real testimonials/social proof added (product doesn't have
  users yet) — revisit once it does. Design still mid-iteration; no ADR written.

## 2026-07-06 — Problem-space map of the Dottore Commercialista
- **Did:** deep problem exploration of the profession (knowledge-based, no internet):
  mapped ~97 activities across 9 functional areas plus the temporal rhythm
  (giornata/mese/anno tipo), each as a structured activity card with
  automation-oriented fields (Sistemi toccati, Natura rule-based vs judgment).
- **Changed:** created [content/knowledge/problem-space.md](content/knowledge/problem-space.md)
  as a single renderable file (initially drafted as a multi-file folder at the repo
  root, then merged here and the old `dott-comm/problem-space/` folder removed).
- **Follow-ups:** validate deadlines/details with a practicing commercialista;
  Lavoro e paghe (Consulente del Lavoro) deliberately excluded — needs its own
  separate research; next: rank activities into a Skill/MCP build order.

## 2026-07-06 — Company created
- **Did:** established Dott. Comm. as the first sub-company brain under Team System.
- **Changed:** created `companies/dott-comm/` with the standard layout.
- **Follow-ups:** fill in `CLAUDE.md` (what the company does) and seed initial
  knowledge (brand, clients, stack).
