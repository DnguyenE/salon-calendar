"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Booking,
  BusinessHours,
  DragGhostPreview,
  Technician,
} from "@/src/types";
import type { SidebarTimeStepMinutes } from "@/src/lib/time";
import {
  dayEnd,
  dayStart,
  formatTimeAxisLabel,
  isSameDayInTz,
  minutesSinceDayStart,
  slotsForDay,
} from "@/src/lib/time";
import {
  SLOT_HEIGHT_PX,
  TIME_AXIS_WIDTH_PX,
} from "@/src/lib/ui";
import { parseISO } from "date-fns";
import { TechnicianColumn } from "./TechnicianColumn";

interface DayGridProps {
  date: Date;
  timezone: string;
  businessHours: BusinessHours;
  sidebarTimeStepMinutes: SidebarTimeStepMinutes;
  technicians: Technician[];
  bookings: Booking[];
  clockedInIds?: ReadonlySet<string>;
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
  canCreateFromSlots?: boolean;
  canDragBookings?: boolean;
  bookingDragActive?: boolean;
  bookingDragCaptureReady?: boolean;
  draggingBookingId?: string | null;
  dragSnapDurationMinutes?: number | null;
  dragOverTarget?: { technicianId: string; slotISO: string } | null;
  dragGhost?: DragGhostPreview | null;
  onBookingDragStart?: (bookingId: string) => void;
  onBookingDragEnd?: () => void;
  onSlotDragOver?: (technicianId: string, slotISO: string) => void;
  onSlotDrop?: (technicianId: string, slotISO: string) => void;
}

export function DayGrid({
  date,
  timezone,
  businessHours,
  sidebarTimeStepMinutes,
  technicians,
  bookings,
  clockedInIds,
  onSlotClick,
  onBookingClick,
  canCreateFromSlots = true,
  canDragBookings = false,
  bookingDragActive = false,
  bookingDragCaptureReady = false,
  draggingBookingId = null,
  dragSnapDurationMinutes = null,
  dragOverTarget = null,
  dragGhost = null,
  onBookingDragStart,
  onBookingDragEnd,
  onSlotDragOver,
  onSlotDrop,
}: DayGridProps) {
  const slots = slotsForDay(date, timezone, businessHours);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const inBusinessHours =
    now.getTime() >= dayStart(date, timezone, businessHours).getTime() &&
    now.getTime() <= dayEnd(date, timezone, businessHours).getTime();
  const showNowLine = isSameDayInTz(date, now, timezone) && inBusinessHours;
  const gridHeight = slots.length * SLOT_HEIGHT_PX;
  const nowLineTop = useMemo(() => {
    const minutes = minutesSinceDayStart(now, timezone, businessHours);
    const rawTop =
      (minutes / businessHours.slotMinutes) * SLOT_HEIGHT_PX;
    return Math.min(Math.max(rawTop, 0), gridHeight);
  }, [businessHours, gridHeight, now, timezone]);

  return (
    <div
      className="flex min-h-0 flex-1 items-start overflow-auto bg-white [webkit-overflow-scrolling:touch] dark:bg-zinc-950"
      style={{ touchAction: "pan-x pan-y" }}
    >
      <div
        className="sticky left-0 z-20 flex-shrink-0 self-start border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        style={{ width: TIME_AXIS_WIDTH_PX }}
      >
        <div className="sticky top-0 z-10 h-12 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        <div
          className="relative border-b border-zinc-300 dark:border-zinc-700"
          style={{ height: slots.length * SLOT_HEIGHT_PX }}
        >
          {slots.map((slot, idx) => {
            const minutes = minutesSinceDayStart(slot, timezone, businessHours);
            if (minutes % sidebarTimeStepMinutes !== 0) return null;
            return (
              <div
                key={slot.toISOString()}
                className="absolute inset-x-0 flex items-start justify-end pr-2 pt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                style={{ top: idx * SLOT_HEIGHT_PX }}
              >
                {formatTimeAxisLabel(slot, timezone, sidebarTimeStepMinutes)}
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

      <div className="flex min-h-0 min-w-0 flex-1 items-start select-none">
        {technicians.map((technician) => (
          <TechnicianColumn
            key={technician.id}
            technician={technician}
            date={date}
            timezone={timezone}
            businessHours={businessHours}
            sidebarTimeStepMinutes={sidebarTimeStepMinutes}
            bookings={bookings.filter(
              (b) =>
                b.technicianId === technician.id &&
                isSameDayInTz(parseISO(b.startISO), date, timezone),
            )}
            isClockedIn={clockedInIds ? clockedInIds.has(technician.id) : true}
            onSlotClick={onSlotClick}
            onBookingClick={onBookingClick}
            canCreateFromSlots={canCreateFromSlots}
            canDragBookings={canDragBookings}
            bookingDragActive={bookingDragActive}
            bookingDragCaptureReady={bookingDragCaptureReady}
            draggingBookingId={draggingBookingId}
            dragSnapDurationMinutes={dragSnapDurationMinutes}
            activeDropSlotISO={
              dragOverTarget?.technicianId === technician.id
                ? dragOverTarget.slotISO
                : null
            }
            dragGhost={
              dragGhost?.technicianId === technician.id ? dragGhost : null
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
