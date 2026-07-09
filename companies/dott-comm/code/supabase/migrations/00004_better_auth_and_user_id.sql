-- Self-hosted Better Auth + billing key rename (ADR 0012, supersedes 0001).
--
-- Two changes land together (generated from the declarative schemas
-- 01_billing.sql + new 03_auth.sql):
--
--  1. Identity moves from WorkOS AuthKit to self-hosted Better Auth, so the
--     legacy key `workos_user_id` (once the WorkOS JWT `sub`) becomes the
--     provider-agnostic `user_id` (now the Better Auth user id) EVERYWHERE it
--     appears: `users_billing`, `tool_events`, and `feedback` — no table keeps
--     the legacy name. A plain RENAME preserves existing trial/telemetry rows —
--     clean cutover, no user rows to migrate, but the rename keeps whatever is
--     there.
--
--  2. Better Auth's own tables (user/session/account/verification + the
--     mcp/oidc tables oauthApplication/oauthAccessToken/oauthConsent) are
--     provisioned here rather than via `@better-auth/cli migrate`, so they live
--     in our migration history (ADR 0007). DDL is emitted verbatim by
--     `@better-auth/cli generate` — see 03_auth.sql.

-- 1. Legacy key rename (billing + telemetry) --------------------------------
alter table public.users_billing
  rename column workos_user_id to user_id;

alter table public.tool_events
  rename column workos_user_id to user_id;

alter table public.feedback
  rename column workos_user_id to user_id;

-- Recreate the usage RPC with the renamed parameter (param names can't change
-- via CREATE OR REPLACE, so drop first). Body is identical apart from the
-- column/param name — it still maintains both the lifetime and per-day counters.
drop function if exists public.increment_usage(text);
create or replace function public.increment_usage(p_user_id text)
returns table (usage_count integer, daily_usage_count integer, plan text)
language sql
security definer
set search_path = public
as $$
  insert into public.users_billing as ub
    (user_id, usage_count, daily_usage_count, daily_usage_date)
  values
    (p_user_id, 1, 1, (now() at time zone 'Europe/Rome')::date)
  on conflict (user_id) do update
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

-- 2. Better Auth tables (verbatim from @better-auth/cli generate) ------------
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "oauthApplication" ("id" text not null primary key, "name" text not null, "icon" text, "metadata" text, "clientId" text not null unique, "clientSecret" text, "redirectUrls" text not null, "type" text not null, "disabled" boolean, "userId" text references "user" ("id") on delete cascade, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create table "oauthAccessToken" ("id" text not null primary key, "accessToken" text not null unique, "refreshToken" text not null unique, "accessTokenExpiresAt" timestamptz not null, "refreshTokenExpiresAt" timestamptz not null, "clientId" text not null references "oauthApplication" ("clientId") on delete cascade, "userId" text references "user" ("id") on delete cascade, "scopes" text not null, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create table "oauthConsent" ("id" text not null primary key, "clientId" text not null references "oauthApplication" ("clientId") on delete cascade, "userId" text not null references "user" ("id") on delete cascade, "scopes" text not null, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "consentGiven" boolean not null);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
create index "oauthApplication_userId_idx" on "oauthApplication" ("userId");
create index "oauthAccessToken_clientId_idx" on "oauthAccessToken" ("clientId");
create index "oauthAccessToken_userId_idx" on "oauthAccessToken" ("userId");
create index "oauthConsent_clientId_idx" on "oauthConsent" ("clientId");
create index "oauthConsent_userId_idx" on "oauthConsent" ("userId");

-- Zero-policy RLS: blocks anon/PostgREST access. The direct `pg` owner
-- connection Better Auth uses (and service_role) bypass it.
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "oauthApplication" enable row level security;
alter table "oauthAccessToken" enable row level security;
alter table "oauthConsent" enable row level security;
