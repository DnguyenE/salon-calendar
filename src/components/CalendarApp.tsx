"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, isSameDay, parseISO } from "date-fns";
import type { Booking } from "@/src/types";
import { useBookings } from "@/src/store/useBookings";
import { useServices } from "@/src/store/useServices";
import { useStaff } from "@/src/store/useStaff";
import { defaultSlotForDay } from "@/src/lib/time";
import { CalendarHeader } from "./CalendarHeader";
import { DayGrid } from "./DayGrid";
import {
  NewBookingPopover,
  type PopoverState,
} from "./NewBookingPopover";

function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

interface CalendarAppProps {
  viewerRole: "admin" | "staff";
}

export function CalendarApp({ viewerRole }: CalendarAppProps) {
  const [date, setDate] = useState<Date>(() => startOfLocalDay(new Date()));
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const bookings = useBookings((s) => s.bookings);
  const bookingsHydrated = useBookings((s) => s.hydrated);
  const hydrateBookings = useBookings((s) => s.hydrate);
  const addBooking = useBookings((s) => s.addBooking);
  const updateBooking = useBookings((s) => s.updateBooking);
  const deleteBooking = useBookings((s) => s.deleteBooking);

  const servicesHydrated = useServices((s) => s.hydrated);
  const services = useServices((s) => s.services);
  const hydrateServices = useServices((s) => s.hydrate);

  const staffHydrated = useStaff((s) => s.hydrated);
  const technicians = useStaff((s) => s.technicians);
  const hydrateStaff = useStaff((s) => s.hydrate);

  const hydrated = bookingsHydrated && servicesHydrated && staffHydrated;
  const hasStaff = technicians.length > 0;
  const canMutateBookings = viewerRole === "admin";

  useEffect(() => {
    void hydrateBookings();
    void hydrateServices();
    void hydrateStaff();
  }, [hydrateBookings, hydrateServices, hydrateStaff]);

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
      if (!canMutateBookings) return;
      setPopover({
        mode: "new",
        technicianId,
        slotISO: slot.toISOString(),
      });
    },
    [canMutateBookings],
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
    if (!hasStaff || !canMutateBookings) return;
    const slot = defaultSlotForDay(date);
    setPopover({ mode: "new", slotISO: slot.toISOString() });
  }, [canMutateBookings, date, hasStaff]);

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
      const service = services.find((s) => s.id === serviceId);
      if (!service) return;
      void addBooking({
        technicianId,
        serviceId,
        customerName,
        startISO: slotISO,
        durationMinutes: service.durationMinutes,
      });
    },
    [addBooking, services],
  );

  const handleUpdate = useCallback(
    (booking: Booking) => {
      const service = services.find((s) => s.id === booking.serviceId);
      if (!service) return;
      void updateBooking({
        id: booking.id,
        technicianId: booking.technicianId,
        serviceId: booking.serviceId,
        customerName: booking.customerName,
        startISO: booking.startISO,
        durationMinutes: service.durationMinutes,
        notes: booking.notes,
      });
    },
    [services, updateBooking],
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
        canCreateAppointment={hasStaff && canMutateBookings}
      />

      {!hydrated ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      ) : !hasStaff ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            go to settings to create a Tech
          </p>
        </div>
      ) : (
        <DayGrid
          date={date}
          bookings={todaysBookings}
          onSlotClick={handleSlotClick}
          onBookingClick={handleBookingClick}
          canCreateFromSlots={canMutateBookings}
        />
      )}

      {popover && hasStaff && (
        <NewBookingPopover
          state={popover}
          bookingsForDay={bookingsForPopoverDay}
          onClose={() => setPopover(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          readOnly={!canMutateBookings}
        />
      )}

      <footer className="border-t border-zinc-200 bg-white px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Tip: ← / → to change days · T for today · Click a slot to book a
        specific tech · Use “+ New appointment” for any tech
      </footer>
    </div>
  );
}
