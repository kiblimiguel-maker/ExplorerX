-- ExplorerX progression system. Run once after v2_migration.sql,
-- community_photos.sql and social_places.sql.
-- XP is stored as a server-side ledger. Clients can read only their own rows.

create table if not exists public.explorer_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('place_created', 'photo_uploaded', 'visit_marked', 'comment_created', 'favorite_added', 'like_added')),
  xp integer not null check (xp > 0 and xp <= 20),
  source_table text not null check (source_table in ('places', 'photos', 'visits', 'comments', 'favorites', 'likes')),
  source_id uuid not null,
  place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, action, source_table, source_id)
);

alter table public.explorer_xp_events enable row level security;

create index if not exists explorer_xp_events_user_created_idx
on public.explorer_xp_events(user_id, created_at desc);

create index if not exists explorer_xp_events_place_idx
on public.explorer_xp_events(place_id);

grant select on public.explorer_xp_events to authenticated;
revoke insert, update, delete on public.explorer_xp_events from anon, authenticated;

drop policy if exists "users read own xp events" on public.explorer_xp_events;
create policy "users read own xp events"
on public.explorer_xp_events for select to authenticated
using (user_id = (select auth.uid()));

create or replace function private.award_explorer_xp(
  target_user_id uuid,
  target_action text,
  target_xp integer,
  target_source_table text,
  target_source_id uuid,
  target_place_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id)
  values (target_user_id, target_action, target_xp, target_source_table, target_source_id, target_place_id)
  on conflict (user_id, action, source_table, source_id) do nothing;
end;
$$;

create or replace function private.award_xp_for_place()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    perform private.award_explorer_xp(new.created_by, 'place_created', 20, 'places', new.id, new.id);
  end if;
  return new;
end;
$$;

create or replace function private.award_xp_for_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_explorer_xp(new.uploaded_by, 'photo_uploaded', 8, 'photos', new.id, new.place_id);
  return new;
end;
$$;

create or replace function private.award_xp_for_visit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_explorer_xp(new.user_id, 'visit_marked', 5, 'visits', new.place_id, new.place_id);
  return new;
end;
$$;

create or replace function private.award_xp_for_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_explorer_xp(new.user_id, 'comment_created', 3, 'comments', new.id, new.place_id);
  return new;
end;
$$;

create or replace function private.award_xp_for_favorite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_explorer_xp(new.user_id, 'favorite_added', 1, 'favorites', new.place_id, new.place_id);
  return new;
end;
$$;

create or replace function private.award_xp_for_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_explorer_xp(new.user_id, 'like_added', 1, 'likes', new.place_id, new.place_id);
  return new;
end;
$$;

drop trigger if exists award_xp_for_place on public.places;
create trigger award_xp_for_place
after insert on public.places
for each row execute function private.award_xp_for_place();

drop trigger if exists award_xp_for_photo on public.photos;
create trigger award_xp_for_photo
after insert on public.photos
for each row execute function private.award_xp_for_photo();

drop trigger if exists award_xp_for_visit on public.visits;
create trigger award_xp_for_visit
after insert on public.visits
for each row execute function private.award_xp_for_visit();

drop trigger if exists award_xp_for_comment on public.comments;
create trigger award_xp_for_comment
after insert on public.comments
for each row execute function private.award_xp_for_comment();

drop trigger if exists award_xp_for_favorite on public.favorites;
create trigger award_xp_for_favorite
after insert on public.favorites
for each row execute function private.award_xp_for_favorite();

drop trigger if exists award_xp_for_like on public.likes;
create trigger award_xp_for_like
after insert on public.likes
for each row execute function private.award_xp_for_like();

-- Backfill XP from existing real activity. The unique constraint keeps this
-- idempotent if the file is accidentally run twice.
insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select created_by, 'place_created', 20, 'places', id, id, created_at
from public.places
where status = 'active'
on conflict (user_id, action, source_table, source_id) do nothing;

insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select uploaded_by, 'photo_uploaded', 8, 'photos', id, place_id, created_at
from public.photos
on conflict (user_id, action, source_table, source_id) do nothing;

insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select user_id, 'visit_marked', 5, 'visits', place_id, place_id, first_visited_at
from public.visits
on conflict (user_id, action, source_table, source_id) do nothing;

insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select user_id, 'comment_created', 3, 'comments', id, place_id, created_at
from public.comments
on conflict (user_id, action, source_table, source_id) do nothing;

insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select user_id, 'favorite_added', 1, 'favorites', place_id, place_id, created_at
from public.favorites
on conflict (user_id, action, source_table, source_id) do nothing;

insert into public.explorer_xp_events (user_id, action, xp, source_table, source_id, place_id, created_at)
select user_id, 'like_added', 1, 'likes', place_id, place_id, created_at
from public.likes
on conflict (user_id, action, source_table, source_id) do nothing;

notify pgrst, 'reload schema';
