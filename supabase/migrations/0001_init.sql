-- Mail AI initial schema.
-- Provisional. Field names and types are likely to shift as the app gets built.

-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gmail_email text,
  gmail_access_token text,
  gmail_refresh_token text,
  gmail_token_expires_at timestamptz,
  daily_send_limit integer not null default 50,
  default_signature text,
  stripe_customer_id text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- campaigns -----------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft','sending','paused','completed','failed')),
  subject_template text,
  body_template text,
  ai_personalize boolean not null default false,
  audience_query text,
  created_at timestamptz not null default now()
);

create index campaigns_user_id_idx on public.campaigns(user_id);

-- recipients ----------------------------------------------------------------
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company text,
  title text,
  personalized_subject text,
  personalized_body text,
  status text not null default 'queued'
    check (status in ('queued','sent','failed')),
  sent_at timestamptz,
  error text
);

create index recipients_campaign_id_idx on public.recipients(campaign_id);
create index recipients_status_idx on public.recipients(status);

-- usage ---------------------------------------------------------------------
create table public.usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null, -- e.g. "2026-04"
  emails_sent integer not null default 0,
  leads_searched integer not null default 0,
  primary key (user_id, month)
);

-- leads_cache ---------------------------------------------------------------
-- Apollo results cached by a normalized query hash so duplicate searches
-- don't burn credits. Provisional shape.
create table public.leads_cache (
  query_hash text primary key,
  query_text text not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.recipients enable row level security;
alter table public.usage enable row level security;

-- profiles: a user can read/update their own row.
-- Tokens are set by Edge Functions using the service-role key, which bypasses RLS.
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- campaigns: full CRUD on your own rows.
create policy "campaigns owner all" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipients: accessible if you own the parent campaign.
create policy "recipients via campaign" on public.recipients
  for all using (
    exists (
      select 1 from public.campaigns c
      where c.id = recipients.campaign_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.campaigns c
      where c.id = recipients.campaign_id and c.user_id = auth.uid()
    )
  );

-- usage: read your own counters; writes go through Edge Functions.
create policy "usage self select" on public.usage
  for select using (auth.uid() = user_id);

-- Realtime ------------------------------------------------------------------
alter publication supabase_realtime add table public.recipients;
alter publication supabase_realtime add table public.campaigns;
