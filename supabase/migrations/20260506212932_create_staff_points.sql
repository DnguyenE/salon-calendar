create table if not exists public.staff_points_daily (
  id uuid primary key default gen_random_uuid(),

  profile_id      uuid not null references public.profiles(id) on delete cascade,
  -- denormalized org id so that qeurying can be easier
  organization_id uuid not null references public.organizations(id) on delete cascade,

  date            date not null,
  points          integer not null default 0 check (points >= 0),

  created_at      timestamptz not null default now(),

  -- one row per staff per day
  unique (profile_id, date)
);

create index if not exists staff_points_daily_org_idx
  on public.staff_points_daily (organization_id);

alter table public.staff_points_daily enable row level security;

-- Select
create policy "staff_points_select_org_members"
  on public.staff_points_daily
  for select
  using (public.has_role_in_org(array['admin', 'staff'], organization_id));

-- Insert
create policy "staff_points_insert_admin"
  on public.staff_points_daily
  for insert
  with check (public.has_role_in_org(array['admin'], organization_id));

-- Update
create policy "staff_points_update_admin"
  on public.staff_points_daily
  for update
  using (public.has_role_in_org(array['admin'], organization_id))
  with check (public.has_role_in_org(array['admin'], organization_id));

-- Delete
create policy "staff_points_delete_admin"
  on public.staff_points_daily
  for delete
  using (public.has_role_in_org(array['admin'], organization_id));