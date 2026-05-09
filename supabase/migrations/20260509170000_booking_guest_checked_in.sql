-- Track walk-in / arrival so staff can mark who has shown up (shown as strikethrough on the calendar card).

alter table public.bookings
add column if not exists guest_checked_in boolean not null default false;
