-- ExplorerX social places. Run after v2_migration.sql, admin_hardening.sql
-- and community_photos.sql.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid(),
  addressee_id uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_requester_id_fkey foreign key (requester_id) references public.users(id) on delete cascade,
  constraint friendships_addressee_id_fkey foreign key (addressee_id) references public.users(id) on delete cascade,
  constraint friendships_different_users check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted', 'rejected'))
);

alter table public.friendships enable row level security;

create unique index if not exists friendships_unique_pair_idx
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_status_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_status_idx on public.friendships(addressee_id, status);

grant select, insert, update (status, updated_at), delete on public.friendships to authenticated;

drop policy if exists "participants read friendships" on public.friendships;
create policy "participants read friendships"
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "users send friendship requests" on public.friendships;
create policy "users send friendship requests"
on public.friendships for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and addressee_id <> (select auth.uid())
  and status = 'pending'
);

drop policy if exists "addressees answer pending requests" on public.friendships;
create policy "addressees answer pending requests"
on public.friendships for update to authenticated
using (addressee_id = (select auth.uid()) and status = 'pending')
with check (
  addressee_id = (select auth.uid())
  and status in ('accepted', 'rejected')
);

drop policy if exists "participants remove friendships" on public.friendships;
create policy "participants remove friendships"
on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create or replace function private.touch_friendship_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_friendship_updated_at on public.friendships;
create trigger touch_friendship_updated_at
before update on public.friendships
for each row execute function private.touch_friendship_updated_at();

create or replace function private.limit_friendship_spam()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*)
    from public.friendships
    where requester_id = new.requester_id
      and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'friend request rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_friendship_spam on public.friendships;
create trigger limit_friendship_spam
before insert on public.friendships
for each row execute function private.limit_friendship_spam();

-- Visits remain private. A user can only read their own rows and rows from
-- accepted friends. Public surfaces use anonymous counters on places instead.
alter table public.visits enable row level security;
grant select, insert, update (last_visited_at), delete on public.visits to authenticated;

drop policy if exists "users read own visits" on public.visits;
drop policy if exists "users and friends read visits" on public.visits;
create policy "users and friends read visits"
on public.visits for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = user_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = user_id)
      )
  )
);

drop policy if exists "users add own visits" on public.visits;
create policy "users add own visits"
on public.visits for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.status = 'active'
  )
);

drop policy if exists "users update own visits" on public.visits;
create policy "users update own visits"
on public.visits for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users remove own visits" on public.visits;
create policy "users remove own visits"
on public.visits for delete to authenticated
using (user_id = (select auth.uid()));

alter table public.places add column if not exists favorites_count integer not null default 0 check (favorites_count >= 0);
alter table public.places add column if not exists comments_count integer not null default 0 check (comments_count >= 0);
alter table public.places add column if not exists photos_count integer not null default 0 check (photos_count >= 0);
alter table public.places add column if not exists visits_count integer not null default 0 check (visits_count >= 0);

update public.places p set
  favorites_count = (select count(*) from public.favorites f where f.place_id = p.id),
  comments_count = (select count(*) from public.comments c where c.place_id = p.id),
  photos_count = (select count(*) from public.photos ph where ph.place_id = p.id),
  visits_count = (select count(*) from public.visits v where v.place_id = p.id);

create or replace function private.sync_place_social_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_place_id uuid;
  target_column text := tg_argv[0];
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  target_place_id := case when tg_op = 'INSERT' then new.place_id else old.place_id end;
  execute format(
    'update public.places set %I = greatest(0, %I + $1) where id = $2',
    target_column,
    target_column
  ) using delta, target_place_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_place_favorites_count on public.favorites;
create trigger sync_place_favorites_count
after insert or delete on public.favorites
for each row execute function private.sync_place_social_count('favorites_count');

drop trigger if exists sync_place_comments_count on public.comments;
create trigger sync_place_comments_count
after insert or delete on public.comments
for each row execute function private.sync_place_social_count('comments_count');

drop trigger if exists sync_place_photos_count on public.photos;
create trigger sync_place_photos_count
after insert or delete on public.photos
for each row execute function private.sync_place_social_count('photos_count');

drop trigger if exists sync_place_visits_count on public.visits;
create trigger sync_place_visits_count
after insert or delete on public.visits
for each row execute function private.sync_place_social_count('visits_count');

-- Reassert community photo permissions without touching either admin policy.
drop policy if exists "users add own photos" on public.photos;
drop policy if exists "authenticated users add photos to active places" on public.photos;
create policy "authenticated users add photos to active places"
on public.photos for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.status = 'active'
  )
);

drop policy if exists "users delete own photos" on public.photos;
create policy "users delete own photos"
on public.photos for delete to authenticated
using (uploaded_by = (select auth.uid()));

notify pgrst, 'reload schema';
