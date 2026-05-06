-- supabase/seed.sql
-- Local/dev seed data. Runs automatically on `supabase db reset` and `supabase start`.

insert into public.organizations (name, slug)
values ('ClientFlow', 'clientflow')
on conflict (slug) do nothing;

-- Local-dev admin users for ClientFlow.
-- All seeded admins share the same trivial password ('password'); these
-- credentials only ever exist in your local DB. To add another admin, append
-- a row to the values list below.
do $$
declare
  v_admin    record;
  v_user_id  uuid;
begin
  for v_admin in
    select *
    from (values
      ('ethan@clientflow.com', 'Ethan', 'Dinh',  'clientflow'),
      ('marko@clientflow.com', 'Marko', 'Zovic', 'clientflow')
    ) as t(email, first_name, last_name, org_slug)
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

    insert into public.profiles (id, organization_id, role, email, first_name, last_name)
    select v_user_id, o.id, 'admin', v_admin.email, v_admin.first_name, v_admin.last_name
    from public.organizations o
    where o.slug = v_admin.org_slug
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      role            = excluded.role,
      email           = excluded.email,
      first_name      = excluded.first_name,
      last_name       = excluded.last_name;
  end loop;
end $$;

with org as (
  select id from public.organizations where slug = 'clientflow'
)
insert into public.services (
  organization_id, name, duration_minutes, price_cents, price_suffix,
  color_class_name, display_order
)
select
  org.id, s.name, s.duration_minutes, s.price_cents, s.price_suffix,
  s.color_class_name, s.display_order
from org
cross join (values
  ('Manicure',            30::smallint, 2000, null::char(1), 'bg-rose-500/90 hover:bg-rose-500 text-white',         0),
  ('Shellac Manicure',    30::smallint, 3500, null::char(1), 'bg-pink-500/90 hover:bg-pink-500 text-white',         1),
  ('Pedicure',            30::smallint, 3000, null::char(1), 'bg-sky-500/90 hover:bg-sky-500 text-white',           2),
  ('Shellac Pedicure',    45::smallint, 4500, null::char(1), 'bg-blue-500/90 hover:bg-blue-500 text-white',         3),
  ('Mani + Pedi',         60::smallint, 5000, null::char(1), 'bg-violet-500/90 hover:bg-violet-500 text-white',     4),
  ('Shellac Mani + Pedi', 75::smallint, 6500, null::char(1), 'bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white',   5),
  ('Full Set Acrylic',    60::smallint, 5000, '+'::char(1),  'bg-amber-500/90 hover:bg-amber-500 text-white',       6),
  ('Acrylic Fill',        45::smallint, 4500, '+'::char(1),  'bg-orange-500/90 hover:bg-orange-500 text-white',     7),
  ('Full Set Bio',        60::smallint, 6500, null::char(1), 'bg-emerald-500/90 hover:bg-emerald-500 text-white',   8),
  ('Bio Fill',            45::smallint, 5500, '+'::char(1),  'bg-teal-500/90 hover:bg-teal-500 text-white',         9),
  ('Overlay on Own Nail', 60::smallint, 6000, null::char(1), 'bg-indigo-500/90 hover:bg-indigo-500 text-white',    10)
) as s(name, duration_minutes, price_cents, price_suffix, color_class_name, display_order)
on conflict (organization_id, lower(name)) do nothing;