import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Booking, BusinessHours, Service, Technician } from "@/src/types";
import { BUSINESS_HOURS } from "@/src/lib/config";
import { getServiceById } from "@/src/store/useServices";

// All "calendar day" semantics in this module are anchored to a caller-supplied
// IANA timezone (e.g. "America/New_York"), not the viewer's browser. Bookings'
// `start_at` is stored in UTC, but a salon runs in one physical timezone and
// the calendar grid must reflect that timezone consistently for everyone.

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Return a UTC Date that points at `hour:00:00` on the calendar day that
// `date` falls on, evaluated in `tz`.
function dayAnchor(date: Date, tz: string, hour: number): Date {
  const ymd = formatInTimeZone(date, tz, "yyyy-MM-dd");
  return fromZonedTime(`${ymd} ${pad2(hour)}:00:00`, tz);
}

export function dayStart(
  date: Date,
  tz: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Date {
  return dayAnchor(date, tz, hours.openHour);
}

export function dayEnd(
  date: Date,
  tz: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Date {
  return dayAnchor(date, tz, hours.closeHour);
}

export function totalSlots(hours: BusinessHours = BUSINESS_HOURS): number {
  const minutes = (hours.closeHour - hours.openHour) * 60;
  return Math.floor(minutes / hours.slotMinutes);
}

export function slotsForDay(
  date: Date,
  tz: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Date[] {
  const start = dayStart(date, tz, hours);
  const count = totalSlots(hours);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(addMinutes(start, i * hours.slotMinutes));
  }
  return out;
}

// Picks a sensible default slot for opening a "new appointment" form on the
// given day. If `date` is today (in `tz`) and the current time is within
// business hours, return the next slot at or after now (rounded up to the
// next slotMinutes boundary). Otherwise return the first slot of the day.
export function defaultSlotForDay(
  date: Date,
  tz: string,
  now: Date = new Date(),
  hours: BusinessHours = BUSINESS_HOURS,
): Date {
  const slots = slotsForDay(date, tz, hours);
  const first = slots[0];
  if (!first) return date;
  if (!isSameDayInTz(date, now, tz)) return first;
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
  tz: string,
  hours: BusinessHours = BUSINESS_HOURS,
): boolean {
  const end = addMinutes(start, service.durationMinutes);
  return end.getTime() <= dayEnd(start, tz, hours).getTime();
}

export function isSameDayInTz(a: Date, b: Date, tz: string): boolean {
  return (
    formatInTimeZone(a, tz, "yyyy-MM-dd") ===
    formatInTimeZone(b, tz, "yyyy-MM-dd")
  );
}

export function isBookingOnDay(
  booking: Booking,
  date: Date,
  tz: string,
): boolean {
  return isSameDayInTz(parseISO(booking.startISO), date, tz);
}

export function dayKey(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export function formatSlotLabel(slot: Date, tz: string): string {
  return formatInTimeZone(slot, tz, "h:mm a");
}

export function formatHourLabel(slot: Date, tz: string): string {
  return formatInTimeZone(slot, tz, "h a");
}

/** Sidebar labels on whole-hour boundaries only use a compact label. */
export function formatTimeAxisLabel(
  slot: Date,
  tz: string,
  stepMinutes: number,
): string {
  if (stepMinutes >= 60) return formatHourLabel(slot, tz);
  return formatSlotLabel(slot, tz);
}

export type SidebarTimeStepMinutes = 15 | 30 | 60;

export function normalizeSidebarTimeStep(
  raw: number | null | undefined,
): SidebarTimeStepMinutes {
  if (raw === 15 || raw === 30 || raw === 60) return raw;
  return 60;
}

/** Maps Supabase `organizations` columns to grid/booking window settings. */
export function normalizeBusinessHours(
  raw:
    | {
        open_hour?: number | null;
        close_hour?: number | null;
        slot_minutes?: number | null;
      }
    | null
    | undefined,
): BusinessHours {
  const fb = BUSINESS_HOURS;
  let openHour = Math.round(Number(raw?.open_hour));
  let closeHour = Math.round(Number(raw?.close_hour));
  let slotMinutes = Math.round(Number(raw?.slot_minutes));
  if (!Number.isFinite(openHour)) openHour = fb.openHour;
  if (!Number.isFinite(closeHour)) closeHour = fb.closeHour;
  if (!Number.isFinite(slotMinutes)) slotMinutes = fb.slotMinutes;
  openHour = Math.min(23, Math.max(0, openHour));
  closeHour = Math.min(24, Math.max(1, closeHour));
  slotMinutes = Math.min(60, Math.max(5, slotMinutes));
  if (closeHour <= openHour) {
    return { ...fb };
  }
  return { openHour, closeHour, slotMinutes };
}

export function minutesSinceDayStart(
  date: Date,
  tz: string,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  return differenceInMinutes(date, dayStart(date, tz, hours));
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
  tz: string,
  ignoreBookingId?: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Technician | null {
  const end = addMinutes(start, durationMinutes);
  if (end.getTime() > dayEnd(start, tz, hours).getTime()) return null;

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
  tz: string,
  ignoreBookingId?: string,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  const end = addMinutes(start, durationMinutes);
  if (end.getTime() > dayEnd(start, tz, hours).getTime()) return 0;
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

export function servicePoints(serviceName: string): number {
  const normalized = serviceName.trim().toLowerCase();
  return normalized.includes("mani") && normalized.includes("pedi") ? 2 : 1;
}

export function dailyPointsByTechnician(
  bookingsForDay: Booking[],
): Map<string, number> {
  const points = new Map<string, number>();
  for (const booking of bookingsForDay) {
    const service = getServiceById(booking.serviceId);
    const bookingPoints = service ? servicePoints(service.name) : 1;
    points.set(
      booking.technicianId,
      (points.get(booking.technicianId) ?? 0) + bookingPoints,
    );
  }
  return points;
}

export function pickAvailableTechByPoints(
  start: Date,
  durationMinutes: number,
  bookingsForDay: Booking[],
  technicians: Technician[],
  tz: string,
  ignoreBookingId?: string,
  hours: BusinessHours = BUSINESS_HOURS,
): Technician | null {
  const end = addMinutes(start, durationMinutes);
  if (end.getTime() > dayEnd(start, tz, hours).getTime()) return null;

  const candidates = technicians.filter((tech) =>
    isTechFreeForRange(
      tech.id,
      start,
      durationMinutes,
      bookingsForDay,
      ignoreBookingId,
    ),
  );
  if (candidates.length === 0) return null;

  const pointsByTech = dailyPointsByTechnician(
    bookingsForDay.filter((b) => b.id !== ignoreBookingId),
  );
  const orderIndex = new Map(technicians.map((t, idx) => [t.id, idx]));

  return [...candidates].sort((a, b) => {
    const aPoints = pointsByTech.get(a.id) ?? 0;
    const bPoints = pointsByTech.get(b.id) ?? 0;
    if (aPoints !== bPoints) return aPoints - bPoints;
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  })[0];
}
