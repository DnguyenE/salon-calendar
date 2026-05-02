import {
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";
import type { Booking, BusinessHours, Service, Technician } from "@/src/types";
import { BUSINESS_HOURS } from "@/src/lib/config";
import { getServiceById } from "@/src/store/useServices";

export function dayStart(date: Date, hours: BusinessHours = BUSINESS_HOURS): Date {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, hours.openHour), 0), 0),
    0,
  );
}

export function dayEnd(date: Date, hours: BusinessHours = BUSINESS_HOURS): Date {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, hours.closeHour), 0), 0),
    0,
  );
}

export function totalSlots(hours: BusinessHours = BUSINESS_HOURS): number {
  const minutes = (hours.closeHour - hours.openHour) * 60;
  return Math.floor(minutes / hours.slotMinutes);
}

export function slotsForDay(
  date: Date,
  hours: BusinessHours = BUSINESS_HOURS,
): Date[] {
  const start = dayStart(date, hours);
  const count = totalSlots(hours);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(addMinutes(start, i * hours.slotMinutes));
  }
  return out;
}

// Picks a sensible default slot for opening a "new appointment" form on the
// given day. If `date` is today and the current time is within business hours,
// return the next slot at or after now (rounded up to the next slotMinutes
// boundary). Otherwise return the first slot of the day.
export function defaultSlotForDay(
  date: Date,
  now: Date = new Date(),
  hours: BusinessHours = BUSINESS_HOURS,
): Date {
  const slots = slotsForDay(date, hours);
  const first = slots[0];
  if (!first) return date;
  if (!isSameDay(date, now)) return first;
  const nowMs = now.getTime();
  const next = slots.find((s) => s.getTime() >= nowMs);
  return next ?? first;
}

export function minutesToRows(
  minutes: number,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  return Math.round(minutes / hours.slotMinutes);
}

export function bookingEnd(booking: Booking): Date {
  const service = getServiceById(booking.serviceId);
  const start = parseISO(booking.startISO);
  if (!service) return start;
  return addMinutes(start, service.durationMinutes);
}

export function bookingsOverlap(a: Booking, b: Booking): boolean {
  if (a.technicianId !== b.technicianId) return false;
  const aStart = parseISO(a.startISO).getTime();
  const aEnd = bookingEnd(a).getTime();
  const bStart = parseISO(b.startISO).getTime();
  const bEnd = bookingEnd(b).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function rangeOverlapsBooking(
  start: Date,
  durationMinutes: number,
  booking: Booking,
): boolean {
  const end = addMinutes(start, durationMinutes).getTime();
  const startMs = start.getTime();
  const bStart = parseISO(booking.startISO).getTime();
  const bEnd = bookingEnd(booking).getTime();
  return startMs < bEnd && bStart < end;
}

export function wouldFitInDay(
  start: Date,
  service: Service,
  hours: BusinessHours = BUSINESS_HOURS,
): boolean {
  const end = addMinutes(start, service.durationMinutes);
  return end.getTime() <= dayEnd(start, hours).getTime();
}

export function isBookingOnDay(booking: Booking, date: Date): boolean {
  return isSameDay(parseISO(booking.startISO), date);
}

export function formatSlotLabel(slot: Date): string {
  return format(slot, "h:mm a");
}

export function formatHourLabel(slot: Date): string {
  return format(slot, "h a");
}

export function minutesSinceDayStart(
  date: Date,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  return differenceInMinutes(date, dayStart(date, hours));
}

function isTechFreeForRange(
  technicianId: string,
  start: Date,
  durationMinutes: number,
  bookingsForDay: Booking[],
  ignoreBookingId?: string,
): boolean {
  return !bookingsForDay.some(
    (b) =>
      b.technicianId === technicianId &&
      b.id !== ignoreBookingId &&
      rangeOverlapsBooking(start, durationMinutes, b),
  );
}

// Pick a tech for an "any tech" booking. Among techs that are free for the
// requested window, prefer the one with the least booked time so far that day,
// breaking ties by display order. On an empty day this is simply sequential
// (Tech 1, then Tech 2, ...), which keeps pay roughly even across techs.
export function pickAvailableTech(
  start: Date,
  durationMinutes: number,
  bookingsForDay: Booking[],
  technicians: Technician[],
  ignoreBookingId?: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Technician | null {
  const end = addMinutes(start, durationMinutes);
  if (end.getTime() > dayEnd(start, hours).getTime()) return null;

  const free = technicians.filter((tech) =>
    isTechFreeForRange(
      tech.id,
      start,
      durationMinutes,
      bookingsForDay,
      ignoreBookingId,
    ),
  );
  if (free.length === 0) return null;

  const minutesByTech = new Map<string, number>();
  for (const b of bookingsForDay) {
    if (b.id === ignoreBookingId) continue;
    const svc = getServiceById(b.serviceId);
    if (!svc) continue;
    minutesByTech.set(
      b.technicianId,
      (minutesByTech.get(b.technicianId) ?? 0) + svc.durationMinutes,
    );
  }

  const orderIndex = new Map(technicians.map((t, i) => [t.id, i]));
  return [...free].sort((a, b) => {
    const la = minutesByTech.get(a.id) ?? 0;
    const lb = minutesByTech.get(b.id) ?? 0;
    if (la !== lb) return la - lb;
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  })[0];
}

export function countAvailableTechs(
  start: Date,
  durationMinutes: number,
  bookingsForDay: Booking[],
  technicians: Technician[],
  ignoreBookingId?: string,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  const end = addMinutes(start, durationMinutes);
  if (end.getTime() > dayEnd(start, hours).getTime()) return 0;
  let count = 0;
  for (const tech of technicians) {
    if (
      isTechFreeForRange(
        tech.id,
        start,
        durationMinutes,
        bookingsForDay,
        ignoreBookingId,
      )
    ) {
      count += 1;
    }
  }
  return count;
}
