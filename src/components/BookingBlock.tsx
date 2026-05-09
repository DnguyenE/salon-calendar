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
  /** One-tap check-in toggle on the card (admins only). */
  onToggleGuestCheckedIn?: (bookingId: string) => void;
  canDrag?: boolean;
  dimmed?: boolean;
  onDragStart?: (bookingId: string) => void;
  onDragEnd?: () => void;
}

export function BookingBlock({
  booking,
  timezone,
  businessHours,
  topRow,
  onClick,
  onToggleGuestCheckedIn,
  canDrag = false,
  dimmed = false,
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

  const showQuickCheckIn = Boolean(onToggleGuestCheckedIn);

  return (
    <div
      className="absolute inset-x-1"
      style={{
        top: topRow * SLOT_HEIGHT_PX + 2,
        height: heightRows * SLOT_HEIGHT_PX - 4,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) return;
          wasDraggedRef.current = true;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", booking.id);
          onDragStart?.(booking.id);
        }}
        onDragOver={(e) => {
          if (!canDrag) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
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
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!wasDraggedRef.current) onClick();
          }
        }}
        title={
          [note, booking.guestCheckedIn ? "Checked in / here" : null]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-md px-2 ${isCompact ? "py-0.5" : "py-1"} text-left text-xs font-medium shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/70 ${
          canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${dimmed ? "opacity-[0.35]" : ""} ${service.colorClassName}`}
      >
        {showQuickCheckIn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleGuestCheckedIn?.(booking.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={
              booking.guestCheckedIn
                ? "Mark not checked in"
                : "Mark checked in / here"
            }
            aria-label={
              booking.guestCheckedIn
                ? "Mark client not checked in"
                : "Mark client checked in"
            }
            className={`absolute right-1 top-1 z-[18] flex shrink-0 items-center justify-center rounded shadow-sm ring-1 ring-black/15 transition-colors hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.97] ${
              isCompact ? "h-5 w-5" : "h-6 w-6"
            } ${
              booking.guestCheckedIn
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-white/90 text-zinc-600 dark:bg-zinc-950/90 dark:text-zinc-300"
            }`}
          >
            {booking.guestCheckedIn ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"}
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"}
                aria-hidden
              >
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
              </svg>
            )}
          </button>
        )}
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            booking.guestCheckedIn
              ? "line-through decoration-current decoration-solid"
              : ""
          }`}
        >
          <div
            className={`flex min-w-0 items-baseline gap-2 leading-tight ${
              showQuickCheckIn ? (isCompact ? "pr-7" : "pr-9") : ""
            }`}
          >
            <span className="min-w-0 flex-1 truncate font-semibold">
              {service.name}
            </span>
            {customerName && (
              <span className="min-w-0 max-w-[50%] shrink truncate text-right text-[11px] font-normal opacity-95">
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
        </div>
      </div>
    </div>
  );
}
