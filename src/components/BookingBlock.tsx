"use client";

import { useRef } from "react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Booking, BusinessHours } from "@/src/types";
import { useServices } from "@/src/store/useServices";
import { bookingEnd } from "@/src/lib/time";
import { SLOT_HEIGHT_PX } from "@/src/lib/ui";
interface BookingBlockProps {
  booking: Booking;
  timezone: string;
  businessHours: BusinessHours;
  topRow: number;
  onClick: () => void;
  canDrag?: boolean;
  onDragStart?: (bookingId: string) => void;
  onDragEnd?: () => void;
}

export function BookingBlock({
  booking,
  timezone,
  businessHours,
  topRow,
  onClick,
  canDrag = false,
  onDragStart,
  onDragEnd,
}: BookingBlockProps) {
  const wasDraggedRef = useRef(false);
  const service = useServices((s) =>
    s.services.find((sv) => sv.id === booking.serviceId),
  );
  if (!service) return null;

  const heightRows = Math.round(
    service.durationMinutes / businessHours.slotMinutes,
  );
  const start = parseISO(booking.startISO);
  const end = bookingEnd(booking);
  const note = booking.notes?.trim() || null;
  const customerName = booking.customerName?.trim() || null;
  // Short appointments need tighter padding so the note's italic descenders
  // don't get clipped by the card's bottom edge.
  const isCompact = heightRows <= 2;
  const timeText = `${formatInTimeZone(start, timezone, "h:mm")}–${formatInTimeZone(
    end,
    timezone,
    "h:mm a",
  )}`;

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return;
        wasDraggedRef.current = true;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", booking.id);
        onDragStart?.(booking.id);
      }}
      onDragEnd={() => {
        onDragEnd?.();
        setTimeout(() => {
          wasDraggedRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (wasDraggedRef.current) return;
        onClick();
      }}
      title={note ?? undefined}
      className={`absolute inset-x-1 flex flex-col overflow-hidden rounded-md px-2 ${
        isCompact ? "py-0.5" : "py-1"
      } text-left text-xs font-medium shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/70 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : ""
      } ${service.colorClassName}`}
      style={{
        top: topRow * SLOT_HEIGHT_PX + 2,
        height: heightRows * SLOT_HEIGHT_PX - 4,
      }}
    >
      <div className="flex items-baseline gap-2 leading-tight">
        <span className="min-w-0 flex-1 truncate font-semibold">
          {service.name}
        </span>
        {customerName && (
          <span className="max-w-[55%] shrink truncate text-[11px] font-normal opacity-95">
            {customerName}
          </span>
        )}
      </div>
      <div className="text-[10px] opacity-80 leading-tight">{timeText}</div>
      {note && (
        <div className="truncate italic text-[10px] opacity-75 leading-tight">
          {note}
        </div>
      )}
    </button>
  );
}
