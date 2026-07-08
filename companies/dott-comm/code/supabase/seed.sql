-- Local dev seed — deterministic billing states for testing the paywall gate
-- WITHOUT Stripe. Runs automatically on `npm run db:reset` / `supabase start`
-- (config.toml: db.seed.enabled = true, sql_paths = ["./seed.sql"]).
--
-- Each row is a fake user id you point `MCP_DEV_USER_ID` at (with
-- MCP_REQUIRE_AUTH=false) to exercise a specific branch of the gate
-- (src/lib/billing/gate.ts). See content/knowledge/local-dev-testing.md.
--
-- Only meaningful for a LOCAL database — never applied to prod (prod rows are
-- lazy-provisioned by increment_usage keyed on real Better Auth user ids).
--
--   dev_trial        fresh trial            → allowed; warns as it nears the cap
--   dev_active       active subscription    → always allowed (no Stripe needed)
--   dev_canceled     canceled subscription  → blocked with the reactivate message
--   dev_trial_spent  trial fully spent      → blocked on the daily allowance
--
-- Idempotent: re-seeding overwrites the counters back to these baselines.

insert into public.users_billing (user_id, plan, usage_count, daily_usage_count, daily_usage_date)
values
  ('dev_trial',       'trial',    0,    0, (now() at time zone 'Europe/Rome')::date),
  ('dev_active',      'active',   0,    0, (now() at time zone 'Europe/Rome')::date),
  ('dev_canceled',    'canceled', 0,    0, (now() at time zone 'Europe/Rome')::date),
  -- Past both the upfront pool and today's daily allowance → next call blocks.
  -- daily_usage_date is set to "today" so increment_usage doesn't reset the
  -- daily counter on the first call after seeding.
  ('dev_trial_spent', 'trial',    999, 999, (now() at time zone 'Europe/Rome')::date)
on conflict (user_id) do update
  set plan              = excluded.plan,
      usage_count       = excluded.usage_count,
      daily_usage_count = excluded.daily_usage_count,
      daily_usage_date  = excluded.daily_usage_date,
      updated_at        = now();
