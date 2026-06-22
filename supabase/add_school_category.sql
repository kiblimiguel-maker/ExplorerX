-- ExplorerX: safely add "Schule" to the existing places category check.
-- Run after schema.sql. Existing places and policies are not changed.

begin;

alter table public.places
  drop constraint if exists places_category_check;

alter table public.places
  add constraint places_category_check
  check (category in ('Sport','Baden','Natur','Aussicht','Essen','Schule','Treffpunkt','Abenteuer','Sonstiges'))
  not valid;

alter table public.places
  validate constraint places_category_check;

commit;

