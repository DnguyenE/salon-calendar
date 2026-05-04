-- supabase/migrations/20260504001300_create_admins.sql

create extension if not exists "pgcrypto";

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  full_profile jsonb,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger
drop trigger if exists admins_set_updated_at on public.admins;
create trigger admins_set_updated_at
  before update on public.admins
  for each row execute function public.set_updated_at();

-- enable RLS
alter table public.admins enable row level security;

-- SELECT
drop policy if exists "admins_select" on public.admins;
create policy "admins_select"
  on public.admins
  for select
  using (
    auth.role() = 'service_role'
    or auth.uid() = id
  );

-- INSERT (service only)
drop policy if exists "admins_insert" on public.admins;
create policy "admins_insert"
  on public.admins
  for insert
  with check (
    auth.role() = 'service_role'
  );

-- UPDATE (prevent privilege escalation)
drop policy if exists "admins_update" on public.admins;
create policy "admins_update"
  on public.admins
  for update
  using (
    auth.role() = 'service_role'
    or auth.uid() = id
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.uid() = id
      AND is_superadmin = false  -- 👈 cannot escalate
    )
  );

-- DELETE
drop policy if exists "admins_delete" on public.admins;
create policy "admins_delete"
  on public.admins
  for delete
  using (auth.role() = 'service_role');