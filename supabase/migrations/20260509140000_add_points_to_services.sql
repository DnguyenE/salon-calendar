-- Booking "points" per service for calendar tallies (default 1; combos often weighted higher).

alter table public.services
  add column if not exists points smallint not null default 1
    check (points >= 1);

comment on column public.services.points is
  'Weight for daily technician point totals in the calendar (e.g. combo services > 1).';

update public.services
set points = 2
where lower(trim(name)) in ('mani + pedi', 'shellac mani + pedi');
