-- supabase/snippets/insert_admin_profile.sql
--
-- Inserts (or refreshes) admin profiles for the ClientFlow organization.
--
-- This snippet does NOT create auth users -- create them first via Supabase
-- Studio (Authentication -> Users -> "Add user") with the matching emails,
-- then run this file. Re-running is safe: each row is upserted on the
-- primary key (auth user id).
--
-- To add another admin, append a row to the `(values ...)` list below.
--
-- How to run:
--   1. Supabase Studio: open the SQL editor and paste this whole file, then Run.
--   2. Local CLI:       psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/snippets/insert_admin_profile.sql
--   3. Remote project:  psql "$SUPABASE_DB_URL" -f supabase/snippets/insert_admin_profile.sql

insert into public.profiles (id, organization_id, role, email, full_name, phone)
select
  u.id,
  o.id,
  'admin',
  u.email,
  d.full_name,
  d.phone
from (values
  ('ethan@clientflow.com', 'Ethan Dinh',  '4372387324', 'clientflow'),
  ('marko@clientflow.com', 'Marko Zovic', '6477614466', 'clientflow')
) as d(email, full_name, phone, org_slug)
join auth.users         u on u.email = d.email
join public.organizations o on o.slug = d.org_slug
on conflict (id) do update set
  organization_id = excluded.organization_id,
  role            = excluded.role,
  email           = excluded.email,
  full_name       = excluded.full_name,
  phone           = excluded.phone
returning *;
