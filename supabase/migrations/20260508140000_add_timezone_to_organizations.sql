-- supabase/migrations/20260508140000_add_timezone_to_organizations.sql
--
-- Each organization runs in a single physical location/timezone. The calendar
-- grid, business hours, and "today" semantics must anchor to that timezone, not
-- the viewer's browser. Without this, an admin in PT viewing a salon that runs
-- in ET sees bookings shifted (and clipped off the visible grid).

alter table public.organizations
  add column if not exists timezone text not null default 'UTC';
