-- supabase/migrations/20260507042600_create_bookings.sql

create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  technician_id   uuid not null references public.profiles(id) on delete restrict,
  service_id      uuid not null references public.services(id) on delete restrict,
  customer_name   text not null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bookings_time_window_chk check (end_at > start_at)
);

create index if not exists bookings_organization_start_idx
  on public.bookings (organization_id, start_at);

create index if not exists bookings_technician_start_idx
  on public.bookings (technician_id, start_at);

create index if not exists bookings_service_idx
  on public.bookings (service_id);

create or replace function public.bookings_validate_org_refs()
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
      using message = 'Technician must be a staff profile in the same organization as the booking.';
  end if;

  if not exists (
    select 1
    from public.services s
    where s.id = new.service_id
      and s.organization_id = new.organization_id
  ) then
    raise exception
      using message = 'Service must belong to the same organization as the booking.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_org_refs on public.bookings;
create trigger bookings_validate_org_refs
  before insert or update on public.bookings
  for each row execute function public.bookings_validate_org_refs();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_org_members" on public.bookings;
create policy "bookings_select_org_members"
  on public.bookings
  for select
  using (public.has_role_in_org(array['admin', 'staff'], bookings.organization_id));

drop policy if exists "bookings_insert_admin" on public.bookings;
create policy "bookings_insert_admin"
  on public.bookings
  for insert
  with check (public.has_role_in_org(array['admin'], bookings.organization_id));

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin"
  on public.bookings
  for update
  using (public.has_role_in_org(array['admin'], bookings.organization_id))
  with check (public.has_role_in_org(array['admin'], bookings.organization_id));

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin"
  on public.bookings
  for delete
  using (public.has_role_in_org(array['admin'], bookings.organization_id));
