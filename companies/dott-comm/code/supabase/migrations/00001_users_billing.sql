-- Billing state for the MCP paywall (ADR 0002).
-- Identity lives in WorkOS (workos_user_id = JWT `sub`), money in Stripe;
-- this table holds request-time entitlement: plan + usage counter + mapping.
-- Access is service-role only (RLS enabled with zero policies).

create table public.users_billing (
  workos_user_id         text primary key,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  plan                   text not null default 'trial'
                         check (plan in ('trial', 'active', 'past_due', 'canceled')),
  usage_count            integer not null default 0,
  trial_started_at       timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index users_billing_stripe_customer_idx
  on public.users_billing (stripe_customer_id);

alter table public.users_billing enable row level security;
-- No policies: only the service-role key (which bypasses RLS) can touch this table.

-- Atomic lazy-provision + increment in one round trip. Returns the NEW count
-- and current plan so the caller can gate without a second query.
create or replace function public.increment_usage(p_workos_user_id text)
returns table (usage_count integer, plan text)
language sql
security definer
set search_path = public
as $$
  insert into public.users_billing as ub (workos_user_id, usage_count)
  values (p_workos_user_id, 1)
  on conflict (workos_user_id) do update
    set usage_count = ub.usage_count + 1,
        updated_at  = now()
  returning ub.usage_count, ub.plan;
$$;
