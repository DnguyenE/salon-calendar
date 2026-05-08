-- supabase/snippets/set_lucynails_timezone.sql
--
-- One-shot: set the Lucy Nails organization's timezone to America/New_York.
-- The booking rows already have correct UTC start_at values for that zone
-- (14:00 UTC = 10:00 AM ET); only the renderer was misinterpreting them in
-- the viewer's local timezone. After running this snippet and deploying the
-- timezone-aware refactor, all bookings will land at their intended times on
-- the calendar grid.
--
-- How to run:
--   1. Supabase Studio: open the SQL editor, paste, Run.
--   2. Local CLI:       psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/snippets/set_lucynails_timezone.sql
--   3. Remote project:  psql "$SUPABASE_DB_URL" -f supabase/snippets/set_lucynails_timezone.sql

update public.organizations
set timezone = 'America/New_York'
where id = 'f2510ebb-8264-43eb-ae53-ccf931a6d953'
returning id, name, timezone;
