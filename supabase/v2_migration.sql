-- ExplorerX v2 migration. Run after schema.sql in the Supabase SQL editor.
alter table public.users add column if not exists avatar_url text check (avatar_url is null or avatar_url ~ '^https://');
alter table public.users add column if not exists bio text check (bio is null or char_length(bio) <= 160);

create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 500),
  created_at timestamptz not null default now(),
  edited_at timestamptz check (edited_at is null or edited_at >= created_at)
);

create table if not exists public.visits (
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.visits enable row level security;

create index if not exists favorites_place_id_idx on public.favorites(place_id);
create index if not exists comments_place_created_idx on public.comments(place_id, created_at desc);
create index if not exists comments_user_created_idx on public.comments(user_id, created_at desc);
create index if not exists visits_user_id_idx on public.visits(user_id);
create index if not exists likes_created_at_idx on public.likes(created_at desc);

grant select on public.users to anon, authenticated;
revoke update on public.users from authenticated;
grant update (display_name, avatar_url, bio) on public.users to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.comments to anon, authenticated;
grant insert, update (body, edited_at), delete on public.comments to authenticated;
grant select, insert, update (last_visited_at) on public.visits to authenticated;

drop policy if exists "users read own profile" on public.users;
drop policy if exists "public profiles are readable" on public.users;
create policy "public profiles are readable" on public.users for select to anon, authenticated using (true);

drop policy if exists "users read own favorites" on public.favorites;
create policy "users read own favorites" on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users add own favorites" on public.favorites;
create policy "users add own favorites" on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users remove own favorites" on public.favorites;
create policy "users remove own favorites" on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "comments are publicly readable" on public.comments;
create policy "comments are publicly readable" on public.comments for select to anon, authenticated using (
  exists (select 1 from public.places p where p.id = place_id and p.status = 'active')
);
drop policy if exists "users add own comments" on public.comments;
create policy "users add own comments" on public.comments for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.places p where p.id = place_id and p.status = 'active')
);
drop policy if exists "users edit own comments" on public.comments;
create policy "users edit own comments" on public.comments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "users read own visits" on public.visits;
create policy "users read own visits" on public.visits for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users add own visits" on public.visits;
create policy "users add own visits" on public.visits for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users update own visits" on public.visits;
create policy "users update own visits" on public.visits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function private.limit_comment_spam()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'comment rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_comment_spam on public.comments;
create trigger limit_comment_spam before insert on public.comments for each row execute function private.limit_comment_spam();

create or replace function private.limit_place_spam()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.places where created_by = new.created_by and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'place rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_place_spam on public.places;
create trigger limit_place_spam before insert on public.places for each row execute function private.limit_place_spam();

drop view if exists public.trending_places;
create view public.trending_places with (security_invoker = true) as
select p.*,
  count(distinct l.user_id) filter (where l.created_at >= now() - interval '7 days')::integer as recent_likes,
  count(distinct c.id) filter (where c.created_at >= now() - interval '7 days')::integer as recent_comments,
  (count(distinct l.user_id) filter (where l.created_at >= now() - interval '7 days') * 3
    + count(distinct c.id) filter (where c.created_at >= now() - interval '7 days') * 2
    + least(p.likes_count, 100) * 0.1)::numeric as trending_score
from public.places p
left join public.likes l on l.place_id = p.id
left join public.comments c on c.place_id = p.id
where p.status = 'active'
group by p.id
order by trending_score desc, p.created_at desc;
grant select on public.trending_places to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users read own avatar objects" on storage.objects;
create policy "users read own avatar objects" on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users delete own avatars" on storage.objects;
create policy "users delete own avatars" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
