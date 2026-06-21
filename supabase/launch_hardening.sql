-- ExplorerX launch hardening. Run once after schema.sql and v2_migration.sql.
-- Keeps the database validation aligned with the public-place form.

alter table public.places drop constraint if exists places_address_check;
alter table public.places add constraint places_address_check check (
  address is null or (
    char_length(address) <= 120
    and address !~* '(strasse|straße|str\.?|weg|gasse|allee|platz|street|road|avenue)[[:space:]]*[0-9]+[[:alpha:]]?'
  )
) not valid;

-- Existing rows remain available. New and edited rows are checked immediately.
-- Validate later after reviewing any legacy rows:
-- alter table public.places validate constraint places_address_check;
