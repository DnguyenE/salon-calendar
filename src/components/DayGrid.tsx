"use client";

import type { Booking } from "@/src/types";
import { useStaff } from "@/src/store/useStaff";
import {
  formatHourLabel,
  minutesSinceDayStart,
  slotsForDay,
} from "@/src/lib/time";
import { SLOT_HEIGHT_PX, TIME_AXIS_WIDTH_PX } from "@/src/lib/ui";
import { parseISO } from "date-fns";
import { TechnicianColumn } from "./TechnicianColumn";

interface DayGridProps {
  date: Date;
  bookings: Booking[];
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
}

export function DayGrid({
  date,
  bookings,
  onSlotClick,
  onBookingClick,
}: DayGridProps) {
  const slots = slotsForDay(date);
  const technicians = useStaff((s) => s.technicians);

  return (
    <div className="flex flex-1 overflow-auto bg-white dark:bg-zinc-950">
      <div
        className="sticky left-0 z-20 flex-shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        style={{ width: TIME_AXIS_WIDTH_PX }}
      >
        <div className="sticky top-0 z-10 h-12 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        <div className="relative" style={{ height: slots.length * SLOT_HEIGHT_PX }}>
          {slots.map((slot, idx) => {
            const minutes = minutesSinceDayStart(slot);
            const isHourStart = minutes % 60 === 0;
            if (!isHourStart) return null;
            return (
              <div
                key={slot.toISOString()}
                className="absolute inset-x-0 flex items-start justify-end pr-2 pt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                style={{ top: idx * SLOT_HEIGHT_PX }}
              >
                {formatHourLabel(slot)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1">
        {technicians.map((technician) => (
          <TechnicianColumn
            key={technician.id}
            technician={technician}
            date={date}
            bookings={bookings.filter(
              (b) =>
                b.technicianId === technician.id &&
                parseISO(b.startISO).toDateString() === date.toDateString(),
            )}
            onSlotClick={onSlotClick}
            onBookingClick={onBookingClick}
          />
        ))}
      </div>
    </div>
  );
}
