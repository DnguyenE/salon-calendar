"use client";

import { parseISO } from "date-fns";
import type { Booking, Technician } from "@/src/types";
import { BUSINESS_HOURS } from "@/src/lib/config";
import {
  minutesToRows,
  minutesSinceDayStart,
  slotsForDay,
} from "@/src/lib/time";
import { SLOT_HEIGHT_PX } from "@/src/lib/ui";
import { BookingBlock } from "./BookingBlock";

interface TechnicianColumnProps {
  technician: Technician;
  date: Date;
  bookings: Booking[];
  isClockedIn?: boolean;
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
  canCreateFromSlots?: boolean;
  canDragBookings?: boolean;
  activeDropSlotISO?: string | null;
  onSlotDragOver?: (technicianId: string, slotISO: string) => void;
  onSlotDrop?: (technicianId: string, slotISO: string) => void;
  onBookingDragStart?: (bookingId: string) => void;
  onBookingDragEnd?: () => void;
  nowLineTop?: number | null;
}

export function TechnicianColumn({
  technician,
  date,
  bookings,
  isClockedIn = true,
  onSlotClick,
  onBookingClick,
  canCreateFromSlots = true,
  canDragBookings = false,
  activeDropSlotISO = null,
  onSlotDragOver,
  onSlotDrop,
  onBookingDragStart,
  onBookingDragEnd,
  nowLineTop = null,
}: TechnicianColumnProps) {
  const slots = slotsForDay(date);
  const hasBookings = bookings.length > 0;
  const warn = !isClockedIn && hasBookings;

  let headerClass =
    "sticky top-0 z-10 flex h-12 flex-col items-center justify-center border-b px-2 text-sm font-semibold";
  if (warn) {
    headerClass +=
      " border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100";
  } else {
    headerClass +=
      " border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";
  }

  let subtitleClass = "mt-0.5 text-[10px] font-normal leading-none";
  if (warn) {
    subtitleClass += " text-amber-700 dark:text-amber-300";
  } else {
    subtitleClass += " text-zinc-400 dark:text-zinc-500";
  }

  const subtitle = !isClockedIn
    ? warn
      ? `\u26A0 Not clocked in`
      : "Not clocked in"
    : null;
  const subtitleTitle = warn
    ? `${technician.firstName} has ${bookings.length} booking${bookings.length === 1 ? "" : "s"} but isn't clocked in for this day. Clock them in from Settings → Round Robin.`
    : !isClockedIn
      ? `${technician.firstName} isn't clocked in for this day.`
      : undefined;

  return (
    <div
      className={`flex min-w-[150px] flex-1 flex-col border-r last:border-r-0 md:min-w-[170px] ${
        warn
          ? "border-zinc-200 bg-amber-50/30 dark:border-zinc-800 dark:bg-amber-950/10"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className={headerClass} title={subtitleTitle}>
        <span>{technician.firstName}</span>
        {subtitle && <span className={subtitleClass}>{subtitle}</span>}
      </div>

      <div
        className="relative"
        style={{ height: slots.length * SLOT_HEIGHT_PX }}
      >
        {slots.map((slot, idx) => {
          const isHourStart = minutesSinceDayStart(slot) % 60 === 0;
          let borderClass = "";
          if (idx === 0) {
            borderClass = "";
          } else if (isHourStart) {
            borderClass = "border-t border-zinc-300 dark:border-zinc-700";
          } else {
            borderClass =
              "border-t border-dashed border-zinc-100/80 dark:border-zinc-900";
          }
          return (
            <button
              key={slot.toISOString()}
              type="button"
              onClick={() => onSlotClick(technician.id, slot)}
              onDragOver={(e) => {
                if (!canDragBookings) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onSlotDragOver?.(technician.id, slot.toISOString());
              }}
              onDrop={(e) => {
                if (!canDragBookings) return;
                e.preventDefault();
                onSlotDrop?.(technician.id, slot.toISOString());
              }}
              disabled={!canCreateFromSlots}
              aria-label={`Book at ${slot.toISOString()} for ${technician.firstName}`}
              className={`absolute inset-x-0 transition-colors dark:hover:bg-white/5 ${borderClass} ${
                canCreateFromSlots
                  ? "cursor-pointer hover:bg-zinc-900/5"
                  : "cursor-default"
              } ${
                canDragBookings && activeDropSlotISO === slot.toISOString()
                  ? "bg-zinc-900/10 dark:bg-white/10"
                  : ""
              }`}
              style={{
                top: idx * SLOT_HEIGHT_PX,
                height: SLOT_HEIGHT_PX,
              }}
            />
          );
        })}

        {bookings.map((booking) => {
          const topRow = minutesToRows(
            minutesSinceDayStart(parseISO(booking.startISO)),
            BUSINESS_HOURS,
          );
          return (
            <BookingBlock
              key={booking.id}
              booking={booking}
              topRow={topRow}
              onClick={() => onBookingClick(booking.id)}
              canDrag={canDragBookings}
              onDragStart={onBookingDragStart}
              onDragEnd={onBookingDragEnd}
            />
          );
        })}

        {nowLineTop !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t border-rose-500"
            style={{ top: nowLineTop }}
          />
        )}
      </div>
    </div>
  );
}
