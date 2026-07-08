-- Better Auth tables — self-hosted auth (ADR 0012), NOT hand-authored.
--
-- Declarative end-state (see 01_billing.sql for the workflow). Better Auth is
-- the website session provider AND the OAuth 2.1 Authorization Server for the
-- MCP; it runs in-process (see lib/auth.ts) and owns these tables. The DDL
-- below is emitted VERBATIM by `npx @better-auth/cli generate` against the
-- configured plugins (magicLink + mcp/oidc) — column names are Better Auth's
-- camelCase, kept quoted on purpose. Do not edit by hand.
--
-- Schema drift on upgrades: after bumping `better-auth`, re-run
--   npx @better-auth/cli generate --config src/lib/auth.ts
-- and diff its output against this file; fold any new columns/tables in via the
-- declarative flow (edit here → db:diff → db:push), never `@better-auth/cli
-- migrate` (which would bypass our migration history — ADR 0007).
--
-- Access: Better Auth reaches these over a DIRECT `pg` connection (DATABASE_URL)
-- as `postgres`, the table owner, which bypasses non-FORCE RLS. We still enable
-- zero-policy RLS on every table so the anon/PostgREST layer (and service_role,
-- which bypasses RLS anyway) can't read auth data through the REST API.

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

-- Zero-policy RLS: blocks the anon/PostgREST path; the direct `pg` owner
-- connection and service_role both bypass it (see header).
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "oauthApplication" enable row level security;
alter table "oauthAccessToken" enable row level security;
alter table "oauthConsent" enable row level security;
