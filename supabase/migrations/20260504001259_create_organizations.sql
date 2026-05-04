-- supabase/migrations/20260504001259_create_organizations.sql

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  slug          text        not null unique,

  open_hour     smallint    not null default 9,
  close_hour    smallint    not null default 19,
  slot_minutes  smallint    not null default 30,

  email         text,
  phone         text,
  address       text,

  logo_url      text,
  brand_color   text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- This function is used to bump the updated_at col
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- This is used to enable RLC (security)
alter table public.organizations enable row level security;

drop policy if exists "organizations_select_all" on public.organizations;
create policy "organizations_select_all"
  on public.organizations
  for select
  using (true);
