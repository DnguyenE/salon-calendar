-- supabase/migrations/20260505061500_create_profiles.sql

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,

  organization_id uuid        not null references public.organizations(id) on delete cascade,
  role            text        not null check (role in ('admin', 'staff')),

  email           text,
  full_name       text,
  avatar_url      text,
  phone           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create or replace function public.has_role_in_org(roles text[], target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any(roles)
      and organization_id = target_org
  )
$$;

-- This is used for users to see their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Admins can read every profile in their own organization.
drop policy if exists "profiles_select_admin_in_own_org" on public.profiles;
create policy "profiles_select_admin_in_own_org"
  on public.profiles
  for select
  using (public.has_role_in_org(array['admin'], profiles.organization_id));

-- Only admins can create new profiles, and only as staff in their own org.
drop policy if exists "profiles_insert_staff_in_own_org" on public.profiles;
drop policy if exists "profiles_insert_by_admin_in_own_org" on public.profiles;
create policy "profiles_insert_staff_by_admin"
  on public.profiles
  for insert
  with check (
    role = 'staff'
    and public.has_role_in_org(array['admin'], profiles.organization_id)
  );

-- No update/delete policies yet.
