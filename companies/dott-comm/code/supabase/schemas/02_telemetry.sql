-- Telemetry + feedback — product signal, never fiscal data (ADR 0006, ADR 0003).
--
-- Declarative end-state (see 01_billing.sql for the workflow); mirrors
-- supabase/migrations/00003_telemetry_feedback.sql. The server persists ZERO
-- studio/client fiscal data: `tool_events` stores call metadata only (argument
-- NAMES, never values); `feedback` stores user-authored text (the model is
-- instructed to keep client data out of it). Access is service-role only.

create table public.tool_events (
  id              bigint generated always as identity primary key,
  workos_user_id  text not null,
  tool            text not null,
  session_id      text,
  outcome         text not null check (outcome in ('ok', 'error', 'blocked')),
  latency_ms      integer,
  args_keys       text[],
  created_at      timestamptz not null default now()
);

-- For the morning digest cron: scan by time window, and per-tool trends.
create index tool_events_created_idx on public.tool_events (created_at);
create index tool_events_tool_created_idx on public.tool_events (tool, created_at);

alter table public.tool_events enable row level security;
-- No policies: only the service-role key (which bypasses RLS) can touch this table.

create table public.feedback (
  id              bigint generated always as identity primary key,
  workos_user_id  text not null,
  categoria       text not null check (categoria in
                    ('capability_mancante', 'comportamento_diverso', 'frizione', 'altro')),
  messaggio       text not null,
  contesto        text,
  created_at      timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No policies: service-role only.
