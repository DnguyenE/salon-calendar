-- supabase/migrations/20260505064300_split_profile_name_drop_phone.sql
--
-- Split `profiles.full_name` into `first_name` / `last_name`

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Best-effort backfill: split on the first space.
update public.profiles
set
  first_name = split_part(full_name, ' ', 1),
  last_name  = case
    when position(' ' in full_name) > 0
      then nullif(btrim(substring(full_name from position(' ' in full_name) + 1)), '')
    else null
  end
where full_name is not null
  and first_name is null
  and last_name is null;

alter table public.profiles
  drop column if exists full_name,
  drop column if exists phone;
