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
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
}

export function TechnicianColumn({
  technician,
  date,
  bookings,
  onSlotClick,
  onBookingClick,
}: TechnicianColumnProps) {
  const slots = slotsForDay(date);

  return (
    <div className="flex min-w-[140px] flex-1 flex-col border-r border-zinc-200 last:border-r-0 dark:border-zinc-800">
      <div className="sticky top-0 z-10 flex h-12 items-center justify-center border-b border-zinc-200 bg-white px-2 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
        {technician.firstName}
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
              aria-label={`Book at ${slot.toISOString()} for ${technician.firstName}`}
              className={`absolute inset-x-0 cursor-pointer transition-colors hover:bg-zinc-900/5 dark:hover:bg-white/5 ${borderClass}`}
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
            />
          );
        })}
      </div>
    </div>
  );
}
