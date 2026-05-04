-- supabase/seed.sql
-- Local/dev seed data. Runs automatically on `supabase db reset` and `supabase start`.

insert into public.organizations (name, slug)
values ('ClientFlow', 'clientflow')
on conflict (slug) do nothing;
