-- ExplorerX community photos. Run after schema.sql and admin_hardening.sql.
-- Keeps admin policies intact while allowing authenticated community uploads.

alter table public.photos enable row level security;
grant select on public.places, public.photos to anon, authenticated;
grant insert, delete on public.photos to authenticated;

drop policy if exists "users add own photos" on public.photos;
create policy "authenticated users add photos to active places"
on public.photos for insert to authenticated
with check (
  (select auth.uid()) = uploaded_by
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.status = 'active'
  )
);

drop policy if exists "users delete own photos" on public.photos;
create policy "users delete own photos"
on public.photos for delete to authenticated
using ((select auth.uid()) = uploaded_by);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 4000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated photo uploads" on storage.objects;
create policy "authenticated photo uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "owners delete photos" on storage.objects;
create policy "owners delete photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create index if not exists photos_uploader_created_idx on public.photos(uploaded_by, created_at desc);

-- Intentionally not dropped or replaced:
--   "admins delete photos" on public.photos
--   "admins delete place photo objects" on storage.objects
