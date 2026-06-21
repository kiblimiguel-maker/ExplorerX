-- ExplorerX place creation rate limits.
-- Run after v2_migration.sql and admin_hardening.sql.
-- Normal users: 5 places per rolling hour and 20 per rolling 24 hours.
-- Admin users: no hourly limit and 100 places per rolling 24 hours.

begin;

do $$
begin
  if pg_catalog.to_regclass('public.admin_users') is null then
    raise exception 'public.admin_users is required before place_rate_limit_update.sql'
      using hint = 'Run supabase/admin_hardening.sql first.';
  end if;
end;
$$;

create index if not exists places_created_by_created_at_idx
on public.places (created_by, created_at desc);

create or replace function private.limit_place_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean;
  hourly_count bigint;
  daily_count bigint;
  inserted_at timestamptz := pg_catalog.clock_timestamp();
begin
  if new.created_by is null then
    raise exception 'place owner is required' using errcode = '23502';
  end if;

  -- Serialize place inserts for this account so concurrent requests cannot
  -- all pass the counter before any of them becomes visible.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.created_by::text, 0)
  );

  -- Use a trusted server timestamp so clients cannot evade the rolling windows
  -- by supplying a backdated created_at value.
  new.created_at := inserted_at;

  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = new.created_by
  )
  into actor_is_admin;

  select
    count(*) filter (
      where place.created_at > inserted_at - interval '1 hour'
    ),
    count(*)
  into hourly_count, daily_count
  from public.places as place
  where place.created_by = new.created_by
    and place.created_at > inserted_at - interval '24 hours';

  if actor_is_admin then
    if daily_count >= 100 then
      raise exception 'place daily rate limit exceeded' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if daily_count >= 20 then
    raise exception 'place daily rate limit exceeded' using errcode = 'P0001';
  end if;

  if hourly_count >= 5 then
    raise exception 'place hourly rate limit exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.limit_place_spam() from public, anon, authenticated;

drop trigger if exists limit_place_spam on public.places;
create trigger limit_place_spam
before insert on public.places
for each row execute function private.limit_place_spam();

comment on function private.limit_place_spam() is
  'Limits normal users to 5 places/hour and 20 places/24h; admins to 100 places/24h.';

commit;
