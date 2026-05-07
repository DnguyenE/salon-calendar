-- supabase/migrations/20260505233100_create_technician_services.sql
--
-- Many-to-many: which staff profile offers which service.

create table if not exists public.technician_services (
  technician_id uuid not null references public.profiles(id) on delete cascade,
  service_id    uuid not null references public.services(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (technician_id, service_id)
);

create index if not exists technician_services_service_idx
  on public.technician_services (service_id);

alter table public.technician_services enable row level security;

drop policy if exists "tech_services_select_org_members" on public.technician_services;
create policy "tech_services_select_org_members"
  on public.technician_services
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = technician_services.technician_id
        and public.has_role_in_org(array['admin', 'staff'], p.organization_id)
    )
  );

drop policy if exists "tech_services_write_admin" on public.technician_services;
create policy "tech_services_write_admin"
  on public.technician_services
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = technician_services.technician_id
        and public.has_role_in_org(array['admin'], p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = technician_services.technician_id
        and public.has_role_in_org(array['admin'], p.organization_id)
    )
  );
