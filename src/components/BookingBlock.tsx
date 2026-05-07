"use client";

import { useRef } from "react";
import { format, parseISO } from "date-fns";
import type { Booking } from "@/src/types";
import { useServices } from "@/src/store/useServices";
import { bookingEnd } from "@/src/lib/time";
import { SLOT_HEIGHT_PX } from "@/src/lib/ui";
import { BUSINESS_HOURS } from "@/src/lib/config";

interface BookingBlockProps {
  booking: Booking;
  topRow: number;
  onClick: () => void;
  canDrag?: boolean;
  onDragStart?: (bookingId: string) => void;
  onDragEnd?: () => void;
}

export function BookingBlock({
  booking,
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

  const heightRows = Math.round(service.durationMinutes / BUSINESS_HOURS.slotMinutes);
  const start = parseISO(booking.startISO);
  const end = bookingEnd(booking);

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
      className={`absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-medium shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/70 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : ""
      } ${service.colorClassName}`}
      style={{
        top: topRow * SLOT_HEIGHT_PX + 2,
        height: heightRows * SLOT_HEIGHT_PX - 4,
      }}
    >
      <div className="font-semibold leading-tight">{service.name}</div>
      <div className="truncate text-[11px] opacity-95 leading-tight">
        {booking.customerName}
      </div>
      <div className="text-[10px] opacity-80 leading-tight">
        {format(start, "h:mm")}–{format(end, "h:mm a")}
      </div>
    </button>
  );
}
