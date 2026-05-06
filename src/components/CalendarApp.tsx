"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, isSameDay, parseISO } from "date-fns";
import { v4 as uuid } from "uuid";
import type { Booking } from "@/src/types";
import { useBookings } from "@/src/store/useBookings";
import { useServices } from "@/src/store/useServices";
import { defaultSlotForDay } from "@/src/lib/time";
import { CalendarHeader } from "./CalendarHeader";
import { DayGrid } from "./DayGrid";
import {
  NewBookingPopover,
  type PopoverState,
} from "./NewBookingPopover";
// test
function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function CalendarApp() {
  const [date, setDate] = useState<Date>(() => startOfLocalDay(new Date()));
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const bookings = useBookings((s) => s.bookings);
  const bookingsHydrated = useBookings((s) => s.hydrated);
  const hydrateBookings = useBookings((s) => s.hydrate);
  const addBooking = useBookings((s) => s.addBooking);
  const updateBooking = useBookings((s) => s.updateBooking);
  const deleteBooking = useBookings((s) => s.deleteBooking);

  const servicesHydrated = useServices((s) => s.hydrated);
  const hydrateServices = useServices((s) => s.hydrate);

  const hydrated = bookingsHydrated && servicesHydrated;

  useEffect(() => {
    void hydrateBookings();
    void hydrateServices();
  }, [hydrateBookings, hydrateServices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (popover) return;
      if (e.key === "ArrowLeft") setDate((d) => addDays(d, -1));
      else if (e.key === "ArrowRight") setDate((d) => addDays(d, 1));
      else if (e.key.toLowerCase() === "t") setDate(startOfLocalDay(new Date()));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover]);

  const todaysBookings = useMemo(
    () => bookings.filter((b) => isSameDay(parseISO(b.startISO), date)),
    [bookings, date],
  );

  const handleSlotClick = useCallback(
    (technicianId: string, slot: Date) => {
      setPopover({
        mode: "new",
        technicianId,
        slotISO: slot.toISOString(),
      });
    },
    [],
  );

  const handleBookingClick = useCallback(
    (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;
      setPopover({ mode: "edit", booking });
    },
    [bookings],
  );

  const handleNewAppointment = useCallback(() => {
    const slot = defaultSlotForDay(date);
    setPopover({ mode: "new", slotISO: slot.toISOString() });
  }, [date]);

  const handleCreate = useCallback(
    ({
      technicianId,
      serviceId,
      customerName,
      slotISO,
    }: {
      technicianId: string;
      serviceId: string;
      customerName: string;
      slotISO: string;
    }) => {
      const booking: Booking = {
        id: uuid(),
        technicianId,
        serviceId,
        customerName,
        startISO: slotISO,
      };
      void addBooking(booking);
    },
    [addBooking],
  );

  const handleUpdate = useCallback(
    (booking: Booking) => {
      void updateBooking(booking);
    },
    [updateBooking],
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteBooking(id);
    },
    [deleteBooking],
  );

  const popoverDate = useMemo(() => {
    if (popover?.mode === "new") return parseISO(popover.slotISO);
    if (popover?.mode === "edit") return parseISO(popover.booking.startISO);
    return date;
  }, [popover, date]);

  const bookingsForPopoverDay = useMemo(
    () => bookings.filter((b) => isSameDay(parseISO(b.startISO), popoverDate)),
    [bookings, popoverDate],
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CalendarHeader
        date={date}
        onChange={setDate}
        onNewAppointment={handleNewAppointment}
      />

      {!hydrated ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      ) : (
        <DayGrid
          date={date}
          bookings={todaysBookings}
          onSlotClick={handleSlotClick}
          onBookingClick={handleBookingClick}
        />
      )}

      {popover && (
        <NewBookingPopover
          state={popover}
          bookingsForDay={bookingsForPopoverDay}
          onClose={() => setPopover(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      <footer className="border-t border-zinc-200 bg-white px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Tip: ← / → to change days · T for today · Click a slot to book a
        specific tech · Use “+ New appointment” for any tech
      </footer>
    </div>
  );
}
