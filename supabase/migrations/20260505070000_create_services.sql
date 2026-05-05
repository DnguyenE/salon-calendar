-- supabase/migrations/20260505070000_create_services.sql

create extension if not exists "pgcrypto";

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  duration_minutes smallint not null check (duration_minutes > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  price_suffix char(1) check (price_suffix in ('+')),
  color_class_name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_organization_id_idx
  on public.services (organization_id);

create unique index if not exists services_org_name_unique
  on public.services (organization_id, lower(name));

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists "services_select_org_members" on public.services;
create policy "services_select_org_members"
  on public.services
  for select
  using (public.has_role_in_org(array['admin', 'staff'], services.organization_id));

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin"
  on public.services
  for insert
  with check (public.has_role_in_org(array['admin'], services.organization_id));

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin"
  on public.services
  for update
  using (public.has_role_in_org(array['admin'], services.organization_id))
  with check (public.has_role_in_org(array['admin'], services.organization_id));

drop policy if exists "services_delete_admin" on public.services;
create policy "services_delete_admin"
  on public.services
  for delete
  using (public.has_role_in_org(array['admin'], services.organization_id));
