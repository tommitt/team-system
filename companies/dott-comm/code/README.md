# Dott. Comm. — code

Dott. Comm.'s single project: the **MCP server** of tools and skills to automate
Italian accountants' (*commercialisti*) work. The MCP server itself hasn't been
started yet — the exploration phase is still converging on what to build first
(see [content/knowledge/problem-space.md](../content/knowledge/problem-space.md)).

## Marketing site

What lives here today is the public landing page: a Next.js 16 App Router app
(`app/`, `components/`, `lib/`), Vercel-deployable as-is. It's a marketing
artifact, not the MCP server — the two will likely diverge into separate deploy
targets once the server exists.

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

- `app/page.tsx` — the whole page (hero, flow section, closing CTA, footer)
- `components/` — the three client-side islands: `AgentReel` (rotating agent
  name), `CopyPromptButton` (the one CTA, used in nav/hero/closing), and
  `ScrollRevealInit` (fade-up on scroll for `[data-reveal]` elements)
- `lib/prompt.ts` — the onboarding prompt copied to the clipboard by the CTA
- `public/logo.svg` — the "D" monogram mark
