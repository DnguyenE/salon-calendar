-- Vertical time axis label interval (independent of booking slot size).
-- Allowed values align with common grids: 15, 30, or 60 minutes from open.

alter table public.organizations
  add column if not exists sidebar_time_step_minutes smallint not null default 60;

alter table public.organizations
  drop constraint if exists organizations_sidebar_time_step_minutes_check;

alter table public.organizations
  add constraint organizations_sidebar_time_step_minutes_check
  check (sidebar_time_step_minutes in (15, 30, 60));
