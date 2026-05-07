-- supabase/migrations/20260507062000_create_daily_round_robin.sql
--
-- Daily round-robin roster in arrival order per org/date.

create table if not exists public.daily_round_robin (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_date    date not null,
  technician_id   uuid not null references public.profiles(id) on delete cascade,
  position        integer not null check (position >= 0),
  created_at      timestamptz not null default now(),
  primary key (organization_id, service_date, technician_id),
  unique (organization_id, service_date, position)
);

create index if not exists daily_round_robin_lookup_idx
  on public.daily_round_robin (organization_id, service_date, position);

create or replace function public.daily_round_robin_validate_staff_org()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = new.technician_id
      and p.organization_id = new.organization_id
      and p.role = 'staff'
  ) then
    raise exception
      using message = 'Round-robin technician must be a staff profile in the same organization.';
  end if;

  return new;
end;
$$;

drop trigger if exists daily_round_robin_validate_staff_org on public.daily_round_robin;
create trigger daily_round_robin_validate_staff_org
  before insert or update on public.daily_round_robin
  for each row execute function public.daily_round_robin_validate_staff_org();

alter table public.daily_round_robin enable row level security;

drop policy if exists "daily_round_robin_select_org_members" on public.daily_round_robin;
create policy "daily_round_robin_select_org_members"
  on public.daily_round_robin
  for select
  using (public.has_role_in_org(array['admin', 'staff'], daily_round_robin.organization_id));

drop policy if exists "daily_round_robin_insert_admin" on public.daily_round_robin;
create policy "daily_round_robin_insert_admin"
  on public.daily_round_robin
  for insert
  with check (public.has_role_in_org(array['admin'], daily_round_robin.organization_id));

drop policy if exists "daily_round_robin_update_admin" on public.daily_round_robin;
create policy "daily_round_robin_update_admin"
  on public.daily_round_robin
  for update
  using (public.has_role_in_org(array['admin'], daily_round_robin.organization_id))
  with check (public.has_role_in_org(array['admin'], daily_round_robin.organization_id));

drop policy if exists "daily_round_robin_delete_admin" on public.daily_round_robin;
create policy "daily_round_robin_delete_admin"
  on public.daily_round_robin
  for delete
  using (public.has_role_in_org(array['admin'], daily_round_robin.organization_id));
