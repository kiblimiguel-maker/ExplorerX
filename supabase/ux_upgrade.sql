-- ExplorerX UX fields. Run after schema.sql, v2_migration.sql and launch_hardening.sql.
-- This migration deliberately contains no sample places, ratings, likes or comments.

alter table public.places alter column created_by drop not null;
alter table public.places add column if not exists features text[] not null default '{}';
alter table public.places add column if not exists rating_average numeric(2,1) not null default 0;
alter table public.places add column if not exists ratings_count integer not null default 0;

alter table public.places drop constraint if exists places_features_check;
alter table public.places add constraint places_features_check check (
  features <@ array['Kostenlos','Familienfreundlich','Parkplatz','Hund erlaubt','Sonnenuntergang','Indoor','Outdoor']::text[]
);
alter table public.places drop constraint if exists places_rating_average_check;
alter table public.places add constraint places_rating_average_check check (rating_average between 0 and 5);
alter table public.places drop constraint if exists places_ratings_count_check;
alter table public.places add constraint places_ratings_count_check check (ratings_count >= 0);

grant select on public.places to anon, authenticated;
