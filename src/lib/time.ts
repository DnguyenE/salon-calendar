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
import type { Booking, BusinessHours, Service } from "@/src/types";
import { BUSINESS_HOURS, getService } from "@/src/lib/config";

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

export function minutesToRows(
  minutes: number,
  hours: BusinessHours = BUSINESS_HOURS,
): number {
  return Math.round(minutes / hours.slotMinutes);
}

export function bookingEnd(booking: Booking): Date {
  const service = getService(booking.serviceId);
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
