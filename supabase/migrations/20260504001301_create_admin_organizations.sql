-- supabase/migrations/20260504001301_create_admin_organizations.sql

create extension if not exists "pgcrypto";

create table if not exists public.admin_organizations (
  admin_id uuid not null references public.admins(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner', 'manager', 'staff')), -- ✅ constrained roles
  is_pending boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (admin_id, organization_id)
);

create index if not exists admin_organizations_organization_idx
  on public.admin_organizations (organization_id);

create index if not exists admin_organizations_admin_idx
  on public.admin_organizations (admin_id);

-- enable RLS
alter table public.admin_organizations enable row level security;

-- SELECT: service OR member of same org
drop policy if exists "admin_organizations_select" on public.admin_organizations;
create policy "admin_organizations_select"
  on public.admin_organizations
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = public.admin_organizations.organization_id
    )
  );

-- INSERT:
-- service_role OR org owner OR bootstrap first owner
drop policy if exists "admin_organizations_insert" on public.admin_organizations;
create policy "admin_organizations_insert"
  on public.admin_organizations
  for insert
  with check (
    auth.role() = 'service_role'
    or (
      -- 👇 bootstrap: allow user to create their own owner row
      auth.uid() = admin_id
      and role = 'owner'
    )
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = organization_id
        and ao.role = 'owner'
    )
  );

-- UPDATE: only service_role or owner
drop policy if exists "admin_organizations_update" on public.admin_organizations;
create policy "admin_organizations_update"
  on public.admin_organizations
  for update
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = public.admin_organizations.organization_id
        and ao.role = 'owner'
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = organization_id
        and ao.role = 'owner'
    )
  );

-- DELETE: only service_role or owner
drop policy if exists "admin_organizations_delete" on public.admin_organizations;
create policy "admin_organizations_delete"
  on public.admin_organizations
  for delete
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = public.admin_organizations.organization_id
        and ao.role = 'owner'
    )
  );

-- Expand admins SELECT (same org visibility)
drop policy if exists "admins_select" on public.admins;
create policy "admins_select"
  on public.admins
  for select
  using (
    auth.role() = 'service_role'
    or auth.uid() = id
    or exists (
      select 1
      from public.admin_organizations ao1
      where ao1.admin_id = auth.uid()
        and ao1.organization_id in (
          select ao2.organization_id
          from public.admin_organizations ao2
          where ao2.admin_id = public.admins.id
        )
    )
  );

-- Organizations UPDATE: only manager/owner (not staff)
drop policy if exists "organizations_update_by_member" on public.organizations;
create policy "organizations_update_by_member"
  on public.organizations
  for update
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = public.organizations.id
        and ao.role in ('owner', 'manager') -- ✅ tightened
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_organizations ao
      where ao.admin_id = auth.uid()
        and ao.organization_id = public.organizations.id
        and ao.role in ('owner', 'manager')
    )
  );

-- INSERT/DELETE still service-only
drop policy if exists "organizations_insert_service" on public.organizations;
create policy "organizations_insert_service"
  on public.organizations
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists "organizations_delete_service" on public.organizations;
create policy "organizations_delete_service"
  on public.organizations
  for delete
  using (auth.role() = 'service_role');