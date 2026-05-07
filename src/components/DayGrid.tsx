"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, Technician } from "@/src/types";
import { BUSINESS_HOURS } from "@/src/lib/config";
import {
  dayEnd,
  dayStart,
  formatHourLabel,
  minutesSinceDayStart,
  slotsForDay,
} from "@/src/lib/time";
import {
  SLOT_HEIGHT_PX,
  TIME_AXIS_WIDTH_PX,
} from "@/src/lib/ui";
import { isSameDay, parseISO } from "date-fns";
import { TechnicianColumn } from "./TechnicianColumn";

interface DayGridProps {
  date: Date;
  technicians: Technician[];
  bookings: Booking[];
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
  canCreateFromSlots?: boolean;
  canDragBookings?: boolean;
  dragOverTarget?: { technicianId: string; slotISO: string } | null;
  onBookingDragStart?: (bookingId: string) => void;
  onBookingDragEnd?: () => void;
  onSlotDragOver?: (technicianId: string, slotISO: string) => void;
  onSlotDrop?: (technicianId: string, slotISO: string) => void;
}

export function DayGrid({
  date,
  technicians,
  bookings,
  onSlotClick,
  onBookingClick,
  canCreateFromSlots = true,
  canDragBookings = false,
  dragOverTarget = null,
  onBookingDragStart,
  onBookingDragEnd,
  onSlotDragOver,
  onSlotDrop,
}: DayGridProps) {
  const slots = slotsForDay(date);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const inBusinessHours =
    now.getTime() >= dayStart(date, BUSINESS_HOURS).getTime() &&
    now.getTime() <= dayEnd(date, BUSINESS_HOURS).getTime();
  const showNowLine = isSameDay(date, now) && inBusinessHours;
  const gridHeight = slots.length * SLOT_HEIGHT_PX;
  const nowLineTop = useMemo(() => {
    const minutes = minutesSinceDayStart(now, BUSINESS_HOURS);
    const rawTop = (minutes / BUSINESS_HOURS.slotMinutes) * SLOT_HEIGHT_PX;
    return Math.min(Math.max(rawTop, 0), gridHeight);
  }, [gridHeight, now]);

  return (
    <div
      className="flex flex-1 overflow-auto bg-white [webkit-overflow-scrolling:touch] dark:bg-zinc-950"
      style={{ touchAction: "pan-x pan-y" }}
    >
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
          {showNowLine && (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 border-t border-rose-500"
              style={{ top: nowLineTop }}
            />
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 select-none">
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
            canCreateFromSlots={canCreateFromSlots}
            canDragBookings={canDragBookings}
            activeDropSlotISO={
              dragOverTarget?.technicianId === technician.id
                ? dragOverTarget.slotISO
                : null
            }
            onSlotDragOver={onSlotDragOver}
            onSlotDrop={onSlotDrop}
            onBookingDragStart={onBookingDragStart}
            onBookingDragEnd={onBookingDragEnd}
            nowLineTop={showNowLine ? nowLineTop : null}
          />
        ))}
      </div>
    </div>
  );
}
