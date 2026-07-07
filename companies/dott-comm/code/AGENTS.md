<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MCP capabilities

- **Prod source lives under `src/`** (ADR 0008): `src/app` (routes + `src/proxy.ts` middleware), `src/components`, `src/lib`. The `@/*` alias maps to `./src/*` (tsconfig + vitest), so imports stay `@/lib/…`. Config, `public/`, `supabase/`, `scripts/`, `test/`, and `legal/` stay at the `code/` root.
- **Every MCP tool registers through `registerGatedTool`** (`src/lib/mcp/register-gated-tool.ts`) so it's metered by the billing gate (ADR 0002) — never call `server.tool` directly for a capability. `tools.ts` is a thin composer; each capability lives in `src/lib/mcp/skills/` (procedure codificate) or `src/lib/mcp/loops/` (area 09). Prompts (method/template, ungated) go in `src/lib/mcp/prompts.ts`.
- **Telemetry is free for gated tools** (ADR 0006): `registerGatedTool` records one `tool_events` row per call (tool, outcome, latency, argument NAMES — never values) via `src/lib/mcp/telemetry.ts`, fail-open. The single ungated exception is `invia_feedback` (`src/lib/mcp/feedback.ts`), which must keep working past the paywall; don't add others.
- **Pure fiscal logic lives in `src/lib/fiscal/`**, not in the tool handlers — funzioni pure e testabili. Constants with legal weight are centralized in `src/lib/fiscal/constants.ts` and marked `DA VERIFICARE`; every output is a *bozza* (human-in-the-loop). Italian format parsers are in `src/lib/parse/`.
- **No server-side domain state** (ADR 0003): the MCP server never persists studio/client fiscal data — that stays in the studio's files, managed by the client (Claude Code). Supabase holds billing + product signal only (`tool_events`, `feedback` — ADR 0006), never fiscal data.
- **DB schema changes go through the declarative schema** (ADR 0007): edit `supabase/schemas/*.sql` (the source of truth), then `npm run db:diff -- -f <name>` to generate the migration and `npm run db:push` to apply — never hand-write migrations or run SQL in the Supabase editor. Regenerate `src/lib/billing/database.types.ts` with `npm run db:types`. Runbook: `content/knowledge/db-schema-migrations.md`.
- **Tests:** `npm run test` (vitest). Cover the arithmetic in `src/lib/fiscal/` and `src/lib/parse/` when you touch it.
