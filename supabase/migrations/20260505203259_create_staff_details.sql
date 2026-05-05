create extension if not exists "pgcrypto";

-- Staff-specific details (1:1 with profiles)
create table if not exists public.staff_details (
  profile_id     uuid primary key references public.profiles(id) on delete cascade,

  organization_id uuid not null references public.organizations(id) on delete cascade,

  check_in_time  time,
  points         integer not null default 0 check (points >= 0),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists staff_details_organization_id_idx
  on public.staff_details (organization_id);

drop trigger if exists staff_details_set_updated_at on public.staff_details;
create trigger staff_details_set_updated_at
  before update on public.staff_details
  for each row execute function public.set_updated_at();

alter table public.staff_details enable row level security;

-- Only org members can read
drop policy if exists "staff_details_select_org_members" on public.staff_details;
create policy "staff_details_select_org_members"
  on public.staff_details
  for select
  using (public.has_role_in_org(array['admin', 'staff'], staff_details.organization_id));

-- Only admins can insert
drop policy if exists "staff_details_insert_admin" on public.staff_details;
create policy "staff_details_insert_admin"
  on public.staff_details
  for insert
  with check (
    public.has_role_in_org(array['admin'], staff_details.organization_id)
  );

-- Only admins can update
drop policy if exists "staff_details_update_admin" on public.staff_details;
create policy "staff_details_update_admin"
  on public.staff_details
  for update
  using (public.has_role_in_org(array['admin'], staff_details.organization_id))
  with check (public.has_role_in_org(array['admin'], staff_details.organization_id));

-- Only admins can delete
drop policy if exists "staff_details_delete_admin" on public.staff_details;
create policy "staff_details_delete_admin"
  on public.staff_details
  for delete
  using (public.has_role_in_org(array['admin'], staff_details.organization_id));