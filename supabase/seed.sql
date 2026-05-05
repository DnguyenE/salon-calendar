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

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      )
      values (
        '00000000-0000-0000-0000-000000000000', v_user_id,
        'authenticated', 'authenticated',
        v_admin.email, crypt('password', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}', '{}',
        now(), now()
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
