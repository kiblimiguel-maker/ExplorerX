-- Run once in the Supabase SQL editor. Uses publishable browser keys only; never expose service_role.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now()
);
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text not null check (char_length(description) between 15 and 600),
  category text not null check (category in ('Sport','Baden','Natur','Aussicht','Essen','Treffpunkt','Abenteuer','Sonstiges')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text check (
    address is null or (
      char_length(address) <= 120
      and address !~* '(strasse|straße|weg|gasse|allee|platz)[[:space:]]*[0-9]+'
    )
  ),
  image_url text check (image_url is null or image_url ~ '^https://'),
  likes_count integer not null default 0 check (likes_count >= 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','reported','hidden'))
);
create table public.likes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  reported_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 300),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  unique (place_id, reported_by)
);
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.places enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.photos enable row level security;

create index places_status_category_idx on public.places (status, category);
create index places_created_at_idx on public.places (created_at desc);
create index likes_place_id_idx on public.likes (place_id);
create index reports_place_id_status_idx on public.reports (place_id, status);
create index photos_place_id_idx on public.photos (place_id);

grant select on public.places, public.photos to anon;
grant select, insert, update on public.users to authenticated;
grant select, insert on public.places to authenticated;
grant update (name, description, category, latitude, longitude, address, image_url) on public.places to authenticated;
grant select, insert, delete on public.likes to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.photos to authenticated;

create policy "active places are public" on public.places for select using (status = 'active');
create policy "users create places" on public.places for insert to authenticated with check ((select auth.uid()) = created_by and status = 'active');
create policy "owners edit active places" on public.places for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by and status = 'active');
create policy "users read own profile" on public.users for select to authenticated using ((select auth.uid()) = id);
create policy "users create own profile" on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update own profile" on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "likes are readable" on public.likes for select using (true);
create policy "users add own likes" on public.likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users remove own likes" on public.likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "users create reports" on public.reports for insert to authenticated with check (
  (select auth.uid()) = reported_by
  and exists (select 1 from public.places p where p.id = place_id and p.status = 'active')
);
create policy "users read own reports" on public.reports for select to authenticated using ((select auth.uid()) = reported_by);
create policy "photos are readable" on public.photos for select using (exists (select 1 from public.places p where p.id = place_id and p.status = 'active'));
create policy "users add own photos" on public.photos for insert to authenticated with check (
  (select auth.uid()) = uploaded_by
  and exists (select 1 from public.places p where p.id = place_id and p.created_by = (select auth.uid()))
);
create policy "users delete own photos" on public.photos for delete to authenticated using ((select auth.uid()) = uploaded_by);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, display_name) values (new.id, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.sync_place_likes_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_place_id uuid;
begin
  if tg_op = 'DELETE' then
    target_place_id := old.place_id;
  else
    target_place_id := new.place_id;
  end if;
  update public.places
  set likes_count = (select count(*) from public.likes where place_id = target_place_id)
  where id = target_place_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_place_likes_count on public.likes;
create trigger sync_place_likes_count
after insert or delete on public.likes
for each row execute function private.sync_place_likes_count();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 4000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "public place photos" on storage.objects for select using (bucket_id = 'place-photos');
create policy "authenticated photo uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'place-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners delete photos" on storage.objects for delete to authenticated
using (bucket_id = 'place-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Optional seed data: create a real Auth user first, then replace the UUID below.
-- Keeping seeds commented prevents demo records from appearing in a configured production project.
-- insert into public.places (name, description, category, latitude, longitude, address, created_by)
-- values ('Josefwiese', 'Öffentliche Quartierwiese für Picknick und Ballspiele.', 'Treffpunkt', 47.3842, 8.5183, 'Josefwiese, Zürich', '00000000-0000-0000-0000-000000000000');
