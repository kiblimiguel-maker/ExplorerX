-- ExplorerX: friend activity visibility.
-- Run after v2_migration.sql and social_places.sql.
-- Visits and favorites stay private to the owner and confirmed friends.

begin;

alter table public.visits enable row level security;
alter table public.favorites enable row level security;

grant select on public.visits, public.favorites to authenticated;

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

drop policy if exists "users read own favorites" on public.favorites;
drop policy if exists "users and friends read favorites" on public.favorites;
create policy "users and friends read favorites"
on public.favorites for select to authenticated
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

commit;

