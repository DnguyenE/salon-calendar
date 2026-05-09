-- supabase/seed.sql
-- Local/dev seed data. Runs automatically on `supabase db reset` and `supabase start`.

insert into public.organizations (name, slug, email_domain)
values ('ClientFlow', 'clientflow', 'clientflow.com')
on conflict (slug) do update
set email_domain = excluded.email_domain;

-- Local-dev users for ClientFlow (admins + staff technicians).
-- All seeded users share the same trivial password ('password'); these
-- credentials only ever exist in your local DB. To add another user, append
-- a row to the values list below.
do $$
declare
  v_admin    record;
  v_user_id  uuid;
begin
  for v_admin in
    select *
    from (values
      ('ethan@clientflow.com', 'Ethan', 'Dinh',  'admin', 'clientflow'),
      ('marko@clientflow.com', 'Marko', 'Zovic', 'admin', 'clientflow'),
      ('ella@clientflow.com',  'Ella',  null,    'staff', 'clientflow'),
      ('tracy@clientflow.com', 'Tracy', null,    'staff', 'clientflow'),
      ('yen@clientflow.com',   'Yen',   null,    'staff', 'clientflow'),
      ('vanny@clientflow.com', 'Vanny', null,    'staff', 'clientflow')
    ) as t(email, first_name, last_name, role, org_slug)
  loop
    select id into v_user_id
    from auth.users
    where email = v_admin.email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      -- GoTrue requires these token columns to be empty strings, not NULL.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token,
        email_change_token_new, email_change_token_current, email_change,
        phone_change_token, phone_change,
        reauthentication_token
      )
      values (
        '00000000-0000-0000-0000-000000000000', v_user_id,
        'authenticated', 'authenticated',
        v_admin.email, '$2a$10$rFVlYOSpjGA696iZ8lS2TOjRVJ2OkMzED.I10gnwV/MeqPTSz5WRe',
        now(), '{"provider":"email","providers":["email"]}', '{}',
        now(), now(),
        '', '',
        '', '', '',
        '', '',
        ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      )
      values (
        gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_admin.email),
        'email', now(), now(), now()
      );
    end if;

    insert into public.profiles (id, organization_id, role, email, first_name, last_name, password_hash)
    select v_user_id, o.id, v_admin.role, v_admin.email, v_admin.first_name, v_admin.last_name, crypt('password', gen_salt('bf'))
    from public.organizations o
    where o.slug = v_admin.org_slug
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      role            = excluded.role,
      email           = excluded.email,
      first_name      = excluded.first_name,
      last_name       = excluded.last_name,
      password_hash   = excluded.password_hash;
  end loop;
end $$;

with org as (
  select id from public.organizations where slug = 'clientflow'
)
insert into public.services (
  organization_id, name, duration_minutes, price_cents, price_suffix,
  color_class_name, display_order, points
)
select
  org.id, s.name, s.duration_minutes, s.price_cents, s.price_suffix,
  s.color_class_name, s.display_order, s.points
from org
cross join (values
  ('Manicure',            30::smallint, 2000, null::char(1), 'bg-rose-500/90 hover:bg-rose-500 text-white',         0, 1::smallint),
  ('Shellac Manicure',    30::smallint, 3500, null::char(1), 'bg-pink-500/90 hover:bg-pink-500 text-white',         1, 1::smallint),
  ('Pedicure',            30::smallint, 3000, null::char(1), 'bg-sky-500/90 hover:bg-sky-500 text-white',           2, 1::smallint),
  ('Shellac Pedicure',    45::smallint, 4500, null::char(1), 'bg-blue-500/90 hover:bg-blue-500 text-white',         3, 1::smallint),
  ('Mani + Pedi',         60::smallint, 5000, null::char(1), 'bg-violet-500/90 hover:bg-violet-500 text-white',     4, 2::smallint),
  ('Shellac Mani + Pedi', 75::smallint, 6500, null::char(1), 'bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white',   5, 2::smallint),
  ('Full Set Acrylic',    60::smallint, 5000, '+'::char(1),  'bg-amber-500/90 hover:bg-amber-500 text-white',       6, 1::smallint),
  ('Acrylic Fill',        45::smallint, 4500, '+'::char(1),  'bg-orange-500/90 hover:bg-orange-500 text-white',     7, 1::smallint),
  ('Full Set Bio',        60::smallint, 6500, null::char(1), 'bg-emerald-500/90 hover:bg-emerald-500 text-white',   8, 1::smallint),
  ('Bio Fill',            45::smallint, 5500, '+'::char(1),  'bg-teal-500/90 hover:bg-teal-500 text-white',         9, 1::smallint),
  ('Overlay on Own Nail', 60::smallint, 6000, null::char(1), 'bg-indigo-500/90 hover:bg-indigo-500 text-white',    10, 1::smallint)
) as s(name, duration_minutes, price_cents, price_suffix, color_class_name, display_order, points)
on conflict (organization_id, lower(name)) do nothing;

-- Demo: Ella + Tracy do Manicure only; Yen + Vanny do Manicure + Pedicure.
with org as (
  select id from public.organizations where slug = 'clientflow'
),
staff as (
  select p.id, p.first_name
  from public.profiles p
  join org on p.organization_id = org.id
  where p.role = 'staff'
),
svc as (
  select s.id, s.name
  from public.services s
  join org on s.organization_id = org.id
)
insert into public.technician_services (technician_id, service_id)
select staff.id, svc.id
from staff
join svc on
  (staff.first_name in ('Ella', 'Tracy') and svc.name = 'Manicure')
  or
  (staff.first_name in ('Yen', 'Vanny') and svc.name in ('Manicure', 'Pedicure'))
on conflict do nothing;
