-- Grant service_role explicit DML on all app tables (from 01_billing.sql + 02_telemetry.sql).
--
-- The billing gate, the telemetry writer, and `invia_feedback` all reach these
-- tables via PostgREST as service_role. In a hosted Supabase project the grant
-- comes from the platform's default privileges, but a from-migrations rebuild
-- (bare `supabase start` / `db reset`) doesn't apply them for CLI-migrated tables
-- — so the writes hit `42501 permission denied`. Making the grants part of the
-- migration history keeps the replay state self-contained. (service_role bypasses
-- RLS, but still needs the table-level DML grant.)

GRANT DELETE, INSERT, SELECT, UPDATE ON public.users_billing TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.tool_events TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.feedback TO service_role;
