-- Astor Library account metadata and explicit email-marketing consent.
-- Supabase Auth owns passwords, confirmation messages, recovery and sessions.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  email_confirmed_at timestamptz,
  marketing_consent_pending boolean not null default false,
  marketing_consent_requested_at timestamptz,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_withdrawn_at timestamptz,
  marketing_consent_source text,
  marketing_consent_text_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep the migration safe to re-run while the feature is being introduced.
alter table public.profiles add column if not exists email_confirmed_at timestamptz;
alter table public.profiles add column if not exists marketing_consent_pending boolean not null default false;
alter table public.profiles add column if not exists marketing_consent_requested_at timestamptz;

comment on table public.profiles is 'Private Astor Library account metadata and current marketing-email choice.';
comment on column public.profiles.marketing_consent is 'True only after the user makes a separate positive choice.';
comment on column public.profiles.marketing_consent_source is 'Where the current choice was recorded, for example account_registration or account_settings.';

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested boolean := coalesce(new.raw_user_meta_data ->> 'marketing_consent', '') = 'true';
  confirmed boolean := new.email_confirmed_at is not null;
begin
  insert into public.profiles (
    id,
    email,
    email_confirmed_at,
    marketing_consent_pending,
    marketing_consent_requested_at,
    marketing_consent,
    marketing_consent_at,
    marketing_consent_source,
    marketing_consent_text_version
  ) values (
    new.id,
    coalesce(new.email, ''),
    new.email_confirmed_at,
    requested and not confirmed,
    case when requested then now() else null end,
    requested and confirmed,
    case when requested and confirmed then now() else null end,
    case when requested then 'account_registration' else null end,
    case when requested then coalesce(new.raw_user_meta_data ->> 'marketing_consent_text_version', '2026-08-11') else null end
  )
  on conflict (id) do update set
    email = excluded.email,
    email_confirmed_at = excluded.email_confirmed_at,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.sync_auth_user_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    email = coalesce(new.email, ''),
    email_confirmed_at = new.email_confirmed_at,
    marketing_consent = case
      when old.email_confirmed_at is null and new.email_confirmed_at is not null and marketing_consent_pending then true
      else marketing_consent
    end,
    marketing_consent_at = case
      when old.email_confirmed_at is null and new.email_confirmed_at is not null and marketing_consent_pending
        then coalesce(marketing_consent_requested_at, now())
      else marketing_consent_at
    end,
    marketing_consent_pending = case
      when old.email_confirmed_at is null and new.email_confirmed_at is not null then false
      else marketing_consent_pending
    end,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email, email_confirmed_at on auth.users
  for each row
  when (old.email is distinct from new.email or old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute procedure public.sync_auth_user_identity();

create or replace function public.set_marketing_consent(consent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set
    marketing_consent = consent,
    marketing_consent_pending = false,
    marketing_consent_requested_at = case
      when consent and not marketing_consent then now()
      else marketing_consent_requested_at
    end,
    marketing_consent_at = case
      when consent and not marketing_consent then now()
      else marketing_consent_at
    end,
    marketing_consent_withdrawn_at = case
      when not consent and marketing_consent then now()
      when consent then null
      else marketing_consent_withdrawn_at
    end,
    marketing_consent_source = 'account_settings',
    marketing_consent_text_version = '2026-08-11',
    updated_at = now()
  where id = account_id;

  if not found then
    raise exception 'Account profile not found';
  end if;
end;
$$;

revoke all on function public.set_marketing_consent(boolean) from public, anon;
grant execute on function public.set_marketing_consent(boolean) to authenticated;

-- Backfill profile rows if Auth already contains users when this migration runs.
insert into public.profiles (id, email, email_confirmed_at)
select id, coalesce(email, ''), email_confirmed_at
from auth.users
on conflict (id) do update set
  email = excluded.email,
  email_confirmed_at = excluded.email_confirmed_at,
  updated_at = now();
