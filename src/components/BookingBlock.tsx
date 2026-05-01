"use client";

import { format, parseISO } from "date-fns";
import type { Booking } from "@/src/types";
import { getService } from "@/src/lib/config";
import { bookingEnd } from "@/src/lib/time";
import { SLOT_HEIGHT_PX } from "@/src/lib/ui";
import { BUSINESS_HOURS } from "@/src/lib/config";

interface BookingBlockProps {
  booking: Booking;
  topRow: number;
  onClick: () => void;
}

export function BookingBlock({ booking, topRow, onClick }: BookingBlockProps) {
  const service = getService(booking.serviceId);
  if (!service) return null;

  const heightRows = Math.round(service.durationMinutes / BUSINESS_HOURS.slotMinutes);
  const start = parseISO(booking.startISO);
  const end = bookingEnd(booking);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-medium shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/70 ${service.colorClassName}`}
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
