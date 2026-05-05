-- supabase/snippets/insert_admin_profile.sql

insert into public.profiles (id, organization_id, role, email, first_name, last_name)
select
  u.id,
  o.id,
  'admin',
  u.email,
  d.first_name,
  d.last_name
from (values
  ('ethan@clientflow.com', 'Ethan', 'Dinh',  'clientflow'),
  ('marko@clientflow.com', 'Marko', 'Zovic', 'clientflow')
) as d(email, first_name, last_name, org_slug)
join auth.users         u on u.email = d.email
join public.organizations o on o.slug = d.org_slug
on conflict (id) do update set
  organization_id = excluded.organization_id,
  role            = excluded.role,
  email           = excluded.email,
  first_name      = excluded.first_name,
  last_name       = excluded.last_name
returning *;
