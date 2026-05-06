-- Many-to-many: staff <-> services
create table if not exists public.staff_services (
  staff_profile_id uuid not null references public.staff_details(profile_id) on delete cascade,
  service_id       uuid not null references public.services(id) on delete cascade,

  created_at       timestamptz not null default now(),

  primary key (staff_profile_id, service_id)
);

create index if not exists staff_services_org_idx
  on public.staff_services (organization_id);

alter table public.staff_services enable row level security;

-- Org members can read
drop policy if exists "staff_services_select_org_members" on public.staff_services;
create policy "staff_services_select_org_members"
  on public.staff_services
  for select
  using (public.has_role_in_org(array['admin', 'staff'], staff_services.organization_id));

-- Admins manage
drop policy if exists "staff_services_insert_admin" on public.staff_services;
create policy "staff_services_insert_admin"
  on public.staff_services
  for insert
  with check (public.has_role_in_org(array['admin'], staff_services.organization_id));

drop policy if exists "staff_services_delete_admin" on public.staff_services;
create policy "staff_services_delete_admin"
  on public.staff_services
  for delete
  using (public.has_role_in_org(array['admin'], staff_services.organization_id));