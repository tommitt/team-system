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

---

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
