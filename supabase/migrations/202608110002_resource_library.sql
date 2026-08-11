-- Private, account-scoped saved and recently viewed resource state.
-- Resource titles, descriptions and presentation metadata remain in the site catalogue.

-- This narrow database catalogue is an integrity boundary for the public RPC.
-- It intentionally stores only the stable ID and slide bound, not display data.
create table if not exists public.resource_catalogue (
  resource_id text primary key,
  slide_count integer not null check (slide_count between 1 and 250)
);

comment on table public.resource_catalogue is
  'Integrity catalogue of valid Astor resource IDs and slide bounds; display metadata remains in the static site catalogue.';

alter table public.resource_catalogue enable row level security;
revoke all on table public.resource_catalogue from anon, authenticated;

insert into public.resource_catalogue (resource_id, slide_count) values
    ('admiration-for-gatsby', 9),
    ('antony-and-cleopatra', 13),
    ('biography-f-scott-fitzgerald', 16),
    ('biography-harper-lee', 10),
    ('charles-dickens-christmas', 18),
    ('dont-turn-back', 16),
    ('dorian-gray', 18),
    ('dracula-gender-roles', 16),
    ('dracula-overview', 18),
    ('frankenstein', 22),
    ('gatsby-corruption-symbolism-illusion', 8),
    ('gatsby-death-relationships', 9),
    ('gatsby-essay-plan', 8),
    ('gender-power-omkara-maqbool', 12),
    ('ghost-stories', 15),
    ('great-expectations', 21),
    ('great-gatsby-character-study', 14),
    ('great-gatsby-corruption-illusion', 9),
    ('great-gatsby-corruption-illusion-v2', 9),
    ('great-gatsby-notes-critical-reading', 16),
    ('half-of-a-yellow-sun', 14),
    ('handmaids-tale', 18),
    ('king-lear-summary-analysis', 18),
    ('kite-runner', 58),
    ('literature-shaped-halloween', 10),
    ('lost-voice-recovered', 9),
    ('macbeth-quick-guide', 10),
    ('macbeth-summary-analysis', 20),
    ('midsummer-nights-dream', 21),
    ('moby-dick', 16),
    ('odyssey-homer-vs-nolan', 10),
    ('pamelas-psyche', 20),
    ('policing-and-community', 16),
    ('pride-prejudice-key-quotes', 10),
    ('richard-ii', 20),
    ('romeo-and-juliet', 20),
    ('shakespeares-tragedies', 21),
    ('things-we-admire-gatsby', 11),
    ('to-kill-a-mockingbird-characters', 21),
    ('turning-point-great-gatsby', 9),
    ('victorian-christmas-traditions', 13),
    ('wide-sargasso-sea-part-3', 14),
    ('wide-sargasso-sea-study-guide', 21),
    ('winters-tale', 42)
on conflict (resource_id) do update set
  slide_count = excluded.slide_count;

create table if not exists public.resource_library_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_id text not null references public.resource_catalogue (resource_id) on update cascade on delete cascade,
  saved_at timestamptz,
  last_viewed_at timestamptz,
  last_slide integer,
  primary key (user_id, resource_id),
  constraint resource_library_resource_id_format check (
    length(resource_id) between 1 and 128 and
    resource_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint resource_library_slide_range check (
    last_slide is null or last_slide between 1 and 250
  ),
  constraint resource_library_has_state check (
    saved_at is not null or last_viewed_at is not null
  )
);

comment on table public.resource_library_items is
  'Private saved-resource and deduplicated recent-resource state for Astor Library accounts.';
comment on column public.resource_library_items.resource_id is
  'Reference to a resource slug in the site presentation catalogue; no public resource metadata is duplicated here.';

create index if not exists resource_library_saved_idx
  on public.resource_library_items (user_id, saved_at desc)
  where saved_at is not null;

create index if not exists resource_library_recent_idx
  on public.resource_library_items (user_id, last_viewed_at desc)
  where last_viewed_at is not null;

alter table public.resource_library_items enable row level security;
revoke all on table public.resource_library_items from anon, authenticated;
grant select on table public.resource_library_items to authenticated;

drop policy if exists "Users can read their own resource library" on public.resource_library_items;
create policy "Users can read their own resource library"
  on public.resource_library_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.mutate_resource_library(
  p_action text,
  p_resource_id text,
  p_last_slide integer default null
)
returns table (
  resource_id text,
  saved_at timestamptz,
  last_viewed_at timestamptz,
  last_slide integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  changed_at timestamptz := clock_timestamp();
  catalogue_slide_count integer;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_action is null or p_action not in ('view', 'save', 'unsave') then
    raise exception using errcode = '22023', message = 'Invalid resource-library action';
  end if;

  if p_resource_id is null or
     length(p_resource_id) not between 1 and 128 or
     p_resource_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Invalid resource identifier';
  end if;

  if p_last_slide is not null and p_last_slide not between 1 and 250 then
    raise exception using errcode = '22023', message = 'Invalid slide number';
  end if;

  select catalogue.slide_count
  into catalogue_slide_count
  from public.resource_catalogue as catalogue
  where catalogue.resource_id = p_resource_id;

  if catalogue_slide_count is null then
    raise exception using errcode = '22023', message = 'Unknown resource identifier';
  end if;

  if p_last_slide is not null and p_last_slide > catalogue_slide_count then
    raise exception using errcode = '22023', message = 'Slide number exceeds resource length';
  end if;

  if p_action <> 'view' and p_last_slide is not null then
    raise exception using errcode = '22023', message = 'Slide progress is only valid for viewed resources';
  end if;

  if p_action = 'view' then
    insert into public.resource_library_items as item (
      user_id,
      resource_id,
      last_viewed_at,
      last_slide
    ) values (
      account_id,
      p_resource_id,
      changed_at,
      p_last_slide
    )
    on conflict on constraint resource_library_items_pkey do update set
      last_viewed_at = excluded.last_viewed_at,
      last_slide = coalesce(excluded.last_slide, item.last_slide);

  elsif p_action = 'save' then
    insert into public.resource_library_items as item (
      user_id,
      resource_id,
      saved_at
    ) values (
      account_id,
      p_resource_id,
      changed_at
    )
    on conflict on constraint resource_library_items_pkey do update set
      saved_at = coalesce(item.saved_at, excluded.saved_at);
  else
    -- Delete save-only rows outright so the has-state constraint remains true.
    delete from public.resource_library_items as item
    where item.user_id = account_id
      and item.resource_id = p_resource_id
      and item.last_viewed_at is null;

    update public.resource_library_items as item
    set saved_at = null
    where item.user_id = account_id
      and item.resource_id = p_resource_id
      and item.last_viewed_at is not null;
  end if;

  -- Retain only the latest useful unsaved history. This also runs after an
  -- unsave turns an older saved-and-viewed row back into ordinary history.
  -- Saved rows remain until the user removes them, regardless of age.
  delete from public.resource_library_items as stale
  where stale.user_id = account_id
    and stale.saved_at is null
    and stale.resource_id in (
      select candidate.resource_id
      from public.resource_library_items as candidate
      where candidate.user_id = account_id
        and candidate.saved_at is null
        and candidate.last_viewed_at is not null
      order by candidate.last_viewed_at desc, candidate.resource_id
      offset 50
    );

  return query
  select item.resource_id, item.saved_at, item.last_viewed_at, item.last_slide
  from public.resource_library_items as item
  where item.user_id = account_id
    and item.resource_id = p_resource_id;
end;
$$;

revoke all on function public.mutate_resource_library(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.mutate_resource_library(text, text, integer)
  to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  claims jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  now_epoch bigint := floor(extract(epoch from clock_timestamp()))::bigint;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(claims -> 'amr') = 'array' then claims -> 'amr'
        else '[]'::jsonb
      end
    ) as method
    where method ->> 'method' in ('password', 'recovery')
      and method ->> 'timestamp' ~ '^[0-9]+$'
      and (method ->> 'timestamp')::bigint >= now_epoch - 900
      and (method ->> 'timestamp')::bigint <= now_epoch + 60
  ) then
    raise exception using errcode = '42501', message = 'Recent authentication required';
  end if;

  delete from auth.users as account
  where account.id = account_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Account not found';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
