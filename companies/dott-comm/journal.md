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
