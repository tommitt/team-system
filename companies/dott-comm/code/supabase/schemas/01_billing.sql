-- Billing / entitlement — the paywall's source of truth (ADR 0002).
--
-- This file is the DECLARATIVE end-state of the schema, not a migration: edit it
-- to describe the schema you *want*, then run `npm run db:diff -- -f <name>` to
-- generate the migration that gets you there, and `npm run db:push` to apply it.
-- See content/knowledge/db-schema-migrations.md. It folds together the history in
-- supabase/migrations/00001_users_billing.sql + 00002_daily_usage.sql.
--
-- Identity lives in WorkOS (workos_user_id = JWT `sub`), money in Stripe; this
-- table holds request-time entitlement: plan + usage counters + Stripe mapping.
-- Access is service-role only (RLS enabled with zero policies).

create table public.users_billing (
  workos_user_id         text primary key,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  plan                   text not null default 'trial'
                         check (plan in ('trial', 'active', 'past_due', 'canceled')),
  usage_count            integer not null default 0,
  -- Daily free-trial allowance (ADR 0002 revision): "50 upfront, then 20/day".
  -- daily_usage_count tracks calls made on daily_usage_date, a Rome-local date;
  -- increment_usage resets the counter whenever the stored date isn't today.
  daily_usage_count      integer not null default 0,
  daily_usage_date       date not null default ((now() at time zone 'Europe/Rome')::date),
  trial_started_at       timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index users_billing_stripe_customer_idx
  on public.users_billing (stripe_customer_id);

alter table public.users_billing enable row level security;
-- No policies: only the service-role key (which bypasses RLS) can touch this table.

-- Atomic lazy-provision + increment in one round trip, maintaining both the
-- lifetime counter and the per-day counter. Returns the NEW counts and current
-- plan so the caller can gate without a second query.
create or replace function public.increment_usage(p_workos_user_id text)
returns table (usage_count integer, daily_usage_count integer, plan text)
language sql
security definer
set search_path = public
as $$
  insert into public.users_billing as ub
    (workos_user_id, usage_count, daily_usage_count, daily_usage_date)
  values
    (p_workos_user_id, 1, 1, (now() at time zone 'Europe/Rome')::date)
  on conflict (workos_user_id) do update
    set usage_count = ub.usage_count + 1,
        daily_usage_count = case
          when ub.daily_usage_date = (now() at time zone 'Europe/Rome')::date
            then ub.daily_usage_count + 1
          else 1
        end,
        daily_usage_date = (now() at time zone 'Europe/Rome')::date,
        updated_at = now()
  returning ub.usage_count, ub.daily_usage_count, ub.plan;
$$;
