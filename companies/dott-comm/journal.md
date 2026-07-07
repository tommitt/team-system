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
