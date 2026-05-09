"use client";

import { useMemo, useRef } from "react";
import { parseISO } from "date-fns";
import type { SidebarTimeStepMinutes } from "@/src/lib/time";
import type {
  Booking,
  BusinessHours,
  DragGhostPreview,
  Technician,
} from "@/src/types";
import {
  minutesToRows,
  minutesSinceDayStart,
  slotsForDay,
} from "@/src/lib/time";
import { SLOT_HEIGHT_PX } from "@/src/lib/ui";
import { useServices } from "@/src/store/useServices";
import { BookingBlock } from "./BookingBlock";

function clampedStartRowFromPointerY(
  clientY: number,
  gridTopY: number,
  slotsLength: number,
  durationRows: number,
): number {
  const y = clientY - gridTopY;
  const rawRow = Math.floor(y / SLOT_HEIGHT_PX);
  const safeDuration = Math.max(1, durationRows);
  const maxStartRow = Math.max(0, slotsLength - safeDuration);
  return Math.min(Math.max(0, rawRow), maxStartRow);
}

interface TechnicianColumnProps {
  technician: Technician;
  date: Date;
  timezone: string;
  businessHours: BusinessHours;
  sidebarTimeStepMinutes: SidebarTimeStepMinutes;
  bookings: Booking[];
  isClockedIn?: boolean;
  onSlotClick: (technicianId: string, slot: Date) => void;
  onBookingClick: (bookingId: string) => void;
  onToggleGuestCheckedIn?: (bookingId: string) => void;
  canCreateFromSlots?: boolean;
  canDragBookings?: boolean;
  bookingDragActive?: boolean;
  /** Full-column drag layer; deferred so native dragstart is not cancelled by DOM updates. */
  bookingDragCaptureReady?: boolean;
  draggingBookingId?: string | null;
  dragSnapDurationMinutes?: number | null;
  activeDropSlotISO?: string | null;
  dragGhost?: DragGhostPreview | null;
  onSlotDragOver?: (technicianId: string, slotISO: string) => void;
  onSlotDrop?: (technicianId: string, slotISO: string) => void;
  onBookingDragStart?: (bookingId: string) => void;
  onBookingDragEnd?: () => void;
  nowLineTop?: number | null;
  /** Sum booking points only when `startISO` is at or before this instant (e.g. grid clock). */
  completedPointsAsOf: Date;
}

export function TechnicianColumn({
  technician,
  date,
  timezone,
  businessHours,
  sidebarTimeStepMinutes,
  bookings,
  isClockedIn = true,
  onSlotClick,
  onBookingClick,
  onToggleGuestCheckedIn,
  canCreateFromSlots = true,
  canDragBookings = false,
  bookingDragActive = false,
  bookingDragCaptureReady = false,
  draggingBookingId = null,
  dragSnapDurationMinutes = null,
  activeDropSlotISO = null,
  dragGhost = null,
  onSlotDragOver,
  onSlotDrop,
  onBookingDragStart,
  onBookingDragEnd,
  nowLineTop = null,
  completedPointsAsOf,
}: TechnicianColumnProps) {
  const services = useServices((s) => s.services);
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const completedDayPoints = useMemo(() => {
    const byId = new Map(services.map((svc) => [svc.id, svc.points]));
    const asOfMs = completedPointsAsOf.getTime();
    return bookings.reduce((sum, b) => {
      if (parseISO(b.startISO).getTime() > asOfMs) return sum;
      return sum + (byId.get(b.serviceId) ?? 1);
    }, 0);
  }, [bookings, completedPointsAsOf, services]);

  const slots = slotsForDay(date, timezone, businessHours);
  const placementDurationRows = Math.max(
    1,
    Math.round(
      (dragSnapDurationMinutes ?? businessHours.slotMinutes) /
        businessHours.slotMinutes,
    ),
  );

  const reportSlotFromPointer = (clientY: number, gridEl: HTMLElement) => {
    if (!onSlotDragOver) return;
    const row = clampedStartRowFromPointerY(
      clientY,
      gridEl.getBoundingClientRect().top,
      slots.length,
      placementDurationRows,
    );
    const slot = slots[row];
    if (!slot) return;
    onSlotDragOver?.(technician.id, slot.toISOString());
  };

  const dropAtPointer = (clientY: number, gridEl: HTMLElement) => {
    if (!onSlotDrop) return;
    const row = clampedStartRowFromPointerY(
      clientY,
      gridEl.getBoundingClientRect().top,
      slots.length,
      placementDurationRows,
    );
    const slot = slots[row];
    if (!slot) return;
    onSlotDrop?.(technician.id, slot.toISOString());
  };

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
      className={`flex h-min min-w-[150px] flex-1 flex-col self-start border-r last:border-r-0 md:min-w-[170px] ${
        warn
          ? "border-zinc-200 bg-amber-50/30 dark:border-zinc-800 dark:bg-amber-950/10"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className={headerClass} title={subtitleTitle}>
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
          <span>{technician.firstName}</span>
          <span
            className={
              warn
                ? "font-normal text-amber-800/85 dark:text-amber-200/90"
                : "font-normal text-zinc-500 dark:text-zinc-400"
            }
            title="Completed points: services whose appointment start time has passed"
          >
            ({completedDayPoints})
          </span>
        </span>
        {subtitle && <span className={subtitleClass}>{subtitle}</span>}
      </div>

      <div
        ref={gridBodyRef}
        className="relative border-b border-zinc-300 dark:border-zinc-700"
        style={{ height: slots.length * SLOT_HEIGHT_PX }}
      >
        {slots.map((slot, idx) => {
          const minutes = minutesSinceDayStart(slot, timezone, businessHours);
          const onHourLine = minutes % 60 === 0;
          const onStepLine =
            !onHourLine &&
            sidebarTimeStepMinutes < 60 &&
            minutes % sidebarTimeStepMinutes === 0;
          let borderClass = "";
          if (idx === 0) {
            borderClass = "";
          } else if (onHourLine) {
            borderClass = "border-t border-zinc-300 dark:border-zinc-700";
          } else if (onStepLine) {
            borderClass = "border-t border-zinc-200 dark:border-zinc-800";
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
                if (
                  !canDragBookings ||
                  !bookingDragActive ||
                  bookingDragCaptureReady
                ) {
                  return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onSlotDragOver?.(technician.id, slot.toISOString());
              }}
              onDrop={(e) => {
                if (
                  !canDragBookings ||
                  !bookingDragActive ||
                  bookingDragCaptureReady
                ) {
                  return;
                }
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
            minutesSinceDayStart(
              parseISO(booking.startISO),
              timezone,
              businessHours,
            ),
            businessHours,
          );
          return (
            <BookingBlock
              key={booking.id}
              booking={booking}
              timezone={timezone}
              businessHours={businessHours}
              topRow={topRow}
              onClick={() => onBookingClick(booking.id)}
              onToggleGuestCheckedIn={onToggleGuestCheckedIn}
              canDrag={canDragBookings}
              dimmed={
                bookingDragActive && draggingBookingId === booking.id
              }
              onDragStart={onBookingDragStart}
              onDragEnd={onBookingDragEnd}
            />
          );
        })}

        {bookingDragActive && dragGhost && (
          <div
            className={`pointer-events-none absolute inset-x-1 z-[22] flex flex-col overflow-hidden rounded-md border-2 border-dashed px-2 py-0.5 text-left text-xs font-semibold shadow-none ring-0 transition-colors ${
              dragGhost.valid
                ? `${dragGhost.colorClassName} border-zinc-950/25 opacity-[0.42] dark:border-white/40 dark:opacity-[0.38]`
                : "border-rose-500 bg-rose-500/20 text-rose-950 dark:border-rose-400 dark:bg-rose-500/25 dark:text-rose-50"
            } `}
            style={{
              top:
                minutesToRows(
                  minutesSinceDayStart(
                    parseISO(dragGhost.slotISO),
                    timezone,
                    businessHours,
                  ),
                  businessHours,
                ) *
                  SLOT_HEIGHT_PX +
                2,
              height:
                Math.round(
                  dragGhost.durationMinutes / businessHours.slotMinutes,
                ) *
                  SLOT_HEIGHT_PX -
                4,
            }}
          >
            <span className="truncate leading-tight">{dragGhost.label}</span>
            <span className="text-[10px] font-normal leading-tight opacity-90">
              {dragGhost.valid ? "Drop here" : "Unavailable"}
            </span>
          </div>
        )}

        {nowLineTop !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t border-rose-500"
            style={{ top: nowLineTop }}
          />
        )}

        {canDragBookings &&
          bookingDragActive &&
          bookingDragCaptureReady && (
          <div
            className="absolute inset-0 z-[25]"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              const gridEl = gridBodyRef.current;
              if (!gridEl) return;
              reportSlotFromPointer(e.clientY, gridEl);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const gridEl = gridBodyRef.current;
              if (!gridEl) return;
              dropAtPointer(e.clientY, gridEl);
            }}
          />
        )}
      </div>
    </div>
  );
}
