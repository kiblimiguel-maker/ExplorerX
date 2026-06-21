-- ExplorerX Phase 3: server-side admin authorization and moderation policies.
-- Run once after schema.sql, v2_migration.sql and launch_hardening.sql.
-- Admin membership is managed only from the Supabase SQL editor, never by the client.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "users can verify own admin membership" on public.admin_users;
create policy "users can verify own admin membership"
on public.admin_users for select to authenticated
using ((select auth.uid()) = user_id);

alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

grant select on public.users, public.places, public.photos, public.comments, public.reports to authenticated;
grant update (status), delete on public.places to authenticated;
grant delete on public.photos, public.comments to authenticated;
grant update (status, reviewed_at, reviewed_by) on public.reports to authenticated;

drop policy if exists "admins read all users" on public.users;
create policy "admins read all users" on public.users for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins read all places" on public.places;
create policy "admins read all places" on public.places for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins moderate places" on public.places;
create policy "admins moderate places" on public.places for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins delete places" on public.places;
create policy "admins delete places" on public.places for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins read all photos" on public.photos;
create policy "admins read all photos" on public.photos for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins delete photos" on public.photos;
create policy "admins delete photos" on public.photos for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins read all comments" on public.comments;
create policy "admins read all comments" on public.comments for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins delete comments" on public.comments;
create policy "admins delete comments" on public.comments for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins read all reports" on public.reports;
create policy "admins read all reports" on public.reports for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins review reports" on public.reports;
create policy "admins review reports" on public.reports for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (
  exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  and status in ('open', 'reviewed', 'dismissed')
  and (status <> 'reviewed' or (reviewed_by = (select auth.uid()) and reviewed_at is not null))
);

drop policy if exists "admins delete place photo objects" on storage.objects;
create policy "admins delete place photo objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'place-photos'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create index if not exists reports_status_created_idx on public.reports(status, created_at desc);

-- Promote an account from the SQL editor only:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'DEINE-EMAIL@example.com'
-- on conflict (user_id) do nothing;
