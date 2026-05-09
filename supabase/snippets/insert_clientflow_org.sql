-- supabase/snippets/insert_clientflow_org.sql
--
-- Inserts (or refreshes) the "Client Flow" test organization.
--
-- How to run:
--   1. Supabase Studio: open the SQL editor and paste this whole file, then Run.
--   2. Local CLI:       psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/snippets/insert_clientflow_org.sql
--   3. Remote project:  psql "$SUPABASE_DB_URL" -f supabase/snippets/insert_clientflow_org.sql
--
-- Re-running is safe: the row is upserted on the unique `slug` column.

insert into public.organizations (
  name,
  slug,
  open_hour,
  close_hour,
  slot_minutes,
  email,
  phone,
  address,
  brand_color
)
values (
  'Client Flow',
  'client-flow',
  9,
  19,
  15,
  'hello@clientflow.test',
  '+1-555-0100',
  '123 Test Street, Demo City',
  '#7C3AED'
)
on conflict (slug) do update set
  name         = excluded.name,
  open_hour    = excluded.open_hour,
  close_hour   = excluded.close_hour,
  slot_minutes = excluded.slot_minutes,
  email        = excluded.email,
  phone        = excluded.phone,
  address      = excluded.address,
  brand_color  = excluded.brand_color
returning *;
