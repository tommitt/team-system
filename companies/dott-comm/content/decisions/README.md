# Dott. Comm. decisions

ADRs specific to Dott. Comm. Numbered `NNNN-short-title.md`; immutable once
`accepted` (supersede rather than edit). Create with `/record-decision` or from
[`templates/decision.md`](../../../../templates/decision.md). Group-wide decisions
live in `group/content/decisions/` instead.

## Log

| # | Decision | Status |
|---|---|---|
| [0001](0001-mcp-in-nextjs-app-workos-auth.md) | MCP served from the website's Next.js app on Vercel; auth via WorkOS AuthKit | accepted |
| [0002](0002-billing-supabase-stripe-usage-trial.md) | Billing: Supabase for entitlement/usage, Stripe for money, usage-gated free trial | accepted |
| [0003](0003-track-a-stateless-client-local-state.md) | Track A senza stato di dominio server-side: rules engine puro, stato client-local, studio-db come convenzione | accepted |
| [0004](0004-onboarding-claude-connector-gui.md) | Onboarding via il connettore GUI dell'app Claude (non prompt, non deep-link) | accepted |
| [0005](0005-paywall-signed-token-checkout.md) | Link paywall con token firmato → checkout senza re-login | accepted |
| [0006](0006-telemetry-feedback-supabase.md) | Telemetria per-chiamata + feedback esplicito in Supabase — segnale di prodotto senza dati fiscali | accepted |
| [0007](0007-declarative-schema-cli-migrations.md) | Schema dichiarativo + migrazioni via Supabase CLI (fine del SQL editor a mano) | accepted |
