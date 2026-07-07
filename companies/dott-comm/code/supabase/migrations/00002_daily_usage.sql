-- Daily free-trial allowance (revises the flat 50-call cap, ADR 0002).
--
-- Trial model is now "50 upfront, then 20/day": the first `usage_count` calls
-- are the lifetime pool (any pace); once that pool is spent the user drops to a
-- recurring daily allowance that refills at midnight Europe/Rome.
--
-- `daily_usage_count` tracks calls made on `daily_usage_date` (a Rome-local
-- calendar date). The RPC resets the counter whenever the stored date is not
-- today (Rome). Existing rows default to today with a zero counter — harmless,
-- they just get a full daily allowance on the migration day.

alter table public.users_billing
  add column if not exists daily_usage_count integer     not null default 0,
  add column if not exists daily_usage_date  date        not null
    default ((now() at time zone 'Europe/Rome')::date);

-- Atomic lazy-provision + increment in one round trip, now maintaining both the
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
