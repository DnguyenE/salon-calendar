"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, parseISO } from "date-fns";
import type { Booking, BusinessHours, Technician } from "@/src/types";
import { getDailyRoundRobin } from "@/app/actions/roundRobin";
import { useBookings } from "@/src/store/useBookings";
import { useServices } from "@/src/store/useServices";
import { useStaff } from "@/src/store/useStaff";
import {
  dayKey,
  defaultSlotForDay,
  isBookingOnDay,
  rangeOverlapsBooking,
  wouldFitInDay,
} from "@/src/lib/time";
import type { SidebarTimeStepMinutes } from "@/src/lib/time";
import { CalendarHeader } from "./CalendarHeader";
import { DayGrid } from "./DayGrid";
import {
  NewBookingPopover,
  type PopoverState,
} from "./NewBookingPopover";

interface CalendarAppProps {
  viewerRole: "admin" | "staff";
  orgName: string;
  timezone: string;
  sidebarTimeStepMinutes: SidebarTimeStepMinutes;
  businessHours: BusinessHours;
}

export function CalendarApp({
  viewerRole,
  orgName,
  timezone,
  sidebarTimeStepMinutes,
  businessHours,
}: CalendarAppProps) {
  // `date` is treated as "any moment that lies on the desired calendar day in
  // the org's timezone". We never read its hour/minute directly; we always
  // re-derive the day key via `dayKey(date, timezone)`.
  const [date, setDate] = useState<Date>(() => new Date());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [roundRobinIds, setRoundRobinIds] = useState<string[]>([]);
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null);
  /** Sync with draggingBookingId for drop/hover during HTML5 drag (refs avoid stale closures). */
  const draggingBookingIdRef = useRef<string | null>(null);
  const dragCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bookingDragCaptureReady, setBookingDragCaptureReady] =
    useState(false);
  const [dragOverTarget, setDragOverTarget] = useState<{
    technicianId: string;
    slotISO: string;
  } | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

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
  const clockedInIds = useMemo(() => new Set(roundRobinIds), [roundRobinIds]);
  const orderedTechnicians = useMemo(() => {
    if (technicians.length === 0) return [] as Technician[];
    const byId = new Map(technicians.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const ordered: Technician[] = [];

    for (const id of roundRobinIds) {
      const tech = byId.get(id);
      if (!tech || seen.has(id)) continue;
      ordered.push(tech);
      seen.add(id);
    }

    for (const tech of technicians) {
      if (seen.has(tech.id)) continue;
      ordered.push(tech);
    }

    return ordered;
  }, [roundRobinIds, technicians]);
  const hasStaff = orderedTechnicians.length > 0;
  const canMutateBookings = viewerRole === "admin";
  const dateKey = useMemo(() => dayKey(date, timezone), [date, timezone]);

  useEffect(() => {
    void hydrateBookings();
    void hydrateServices();
    void hydrateStaff();
  }, [hydrateBookings, hydrateServices, hydrateStaff]);

  useEffect(() => {
    let cancelled = false;
    const loadRoundRobin = async () => {
      const res = await getDailyRoundRobin(dateKey);
      if (cancelled) return;
      setRoundRobinIds(res.ok ? res.data : []);
    };

    void loadRoundRobin();

    // Refetch when the user comes back to the tab/window so changes made
    // in Settings → Round Robin (often in another tab) show up here.
    const onFocus = () => {
      void loadRoundRobin();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadRoundRobin();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dateKey]);

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
      else if (e.key.toLowerCase() === "t") setDate(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover]);

  const todaysBookings = useMemo(
    () => bookings.filter((b) => isBookingOnDay(b, date, timezone)),
    [bookings, date, timezone],
  );

  const unclockedTechsWithBookings = useMemo(() => {
    if (orderedTechnicians.length === 0) return [] as Technician[];
    const idsWithBookings = new Set(todaysBookings.map((b) => b.technicianId));
    return orderedTechnicians.filter(
      (t) => idsWithBookings.has(t.id) && !clockedInIds.has(t.id),
    );
  }, [clockedInIds, orderedTechnicians, todaysBookings]);

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
    const slot = defaultSlotForDay(date, timezone, new Date(), businessHours);
    setPopover({ mode: "new", slotISO: slot.toISOString() });
  }, [businessHours, canMutateBookings, date, hasStaff, timezone]);

  const handleCreate = useCallback(
    ({
      technicianId,
      serviceId,
      customerName,
      slotISO,
      notes,
    }: {
      technicianId: string;
      serviceId: string;
      customerName: string;
      slotISO: string;
      notes?: string | null;
    }) => {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return;
      void addBooking({
        technicianId,
        serviceId,
        customerName,
        startISO: slotISO,
        durationMinutes: service.durationMinutes,
        notes: notes ?? null,
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

  const handleBookingDragStart = useCallback(
    (bookingId: string) => {
      if (!canMutateBookings) return;
      setDragError(null);
      draggingBookingIdRef.current = bookingId;
      setDraggingBookingId(bookingId);
      setBookingDragCaptureReady(false);
      if (dragCaptureTimerRef.current !== null) {
        clearTimeout(dragCaptureTimerRef.current);
      }
      dragCaptureTimerRef.current = setTimeout(() => {
        dragCaptureTimerRef.current = null;
        setBookingDragCaptureReady(true);
      }, 0);
    },
    [canMutateBookings],
  );

  const resetBookingDragSurface = useCallback(() => {
    if (dragCaptureTimerRef.current !== null) {
      clearTimeout(dragCaptureTimerRef.current);
      dragCaptureTimerRef.current = null;
    }
    draggingBookingIdRef.current = null;
    setDraggingBookingId(null);
    setBookingDragCaptureReady(false);
    setDragOverTarget(null);
  }, []);

  const handleBookingDragEnd = useCallback(() => {
    resetBookingDragSurface();
  }, [resetBookingDragSurface]);

  const handleSlotDragOver = useCallback(
    (technicianId: string, slotISO: string) => {
      if (!canMutateBookings || !draggingBookingIdRef.current) return;
      setDragOverTarget((prev) => {
        if (
          prev?.technicianId === technicianId &&
          prev.slotISO === slotISO
        ) {
          return prev;
        }
        return { technicianId, slotISO };
      });
    },
    [canMutateBookings],
  );

  const handleSlotDrop = useCallback(
    (technicianId: string, slotISO: string) => {
      if (!canMutateBookings) return;
      const activeDragId = draggingBookingIdRef.current;
      if (!activeDragId) return;

      const dragged = bookings.find((b) => b.id === activeDragId);
      const service = dragged
        ? services.find((s) => s.id === dragged.serviceId)
        : undefined;
      if (!dragged || !service) {
        resetBookingDragSurface();
        return;
      }

      if (
        dragged.technicianId === technicianId &&
        dragged.startISO === slotISO
      ) {
        resetBookingDragSurface();
        return;
      }

      const newStart = parseISO(slotISO);
      if (!wouldFitInDay(newStart, service, timezone, businessHours)) {
        setDragError("Cannot move booking outside business hours.");
        resetBookingDragSurface();
        return;
      }

      const overlaps = bookings.some(
        (b) =>
          b.id !== dragged.id &&
          b.technicianId === technicianId &&
          rangeOverlapsBooking(newStart, service.durationMinutes, b),
      );
      if (overlaps) {
        setDragError("Cannot move booking into an occupied time slot.");
        resetBookingDragSurface();
        return;
      }

      setDragError(null);
      void updateBooking({
        id: dragged.id,
        technicianId,
        serviceId: dragged.serviceId,
        customerName: dragged.customerName,
        startISO: slotISO,
        durationMinutes: service.durationMinutes,
        notes: dragged.notes,
      });
      resetBookingDragSurface();
    },
    [
      bookings,
      businessHours,
      canMutateBookings,
      resetBookingDragSurface,
      services,
      timezone,
      updateBooking,
    ],
  );

  const popoverDate = useMemo(() => {
    if (popover?.mode === "new") return parseISO(popover.slotISO);
    if (popover?.mode === "edit") return parseISO(popover.booking.startISO);
    return date;
  }, [popover, date]);

  const bookingsForPopoverDay = useMemo(
    () => bookings.filter((b) => isBookingOnDay(b, popoverDate, timezone)),
    [bookings, popoverDate, timezone],
  );

  const bookingDragActive =
    canMutateBookings && draggingBookingId !== null;

  const dragSnapDurationMinutes = useMemo(() => {
    if (!draggingBookingId) return null;
    const dragged = todaysBookings.find((b) => b.id === draggingBookingId);
    const service = dragged
      ? services.find((s) => s.id === dragged.serviceId)
      : undefined;
    return service?.durationMinutes ?? null;
  }, [draggingBookingId, services, todaysBookings]);

  const dragGhost = useMemo(() => {
    if (!draggingBookingId || !dragOverTarget) return null;
    const dragged = bookings.find((b) => b.id === draggingBookingId);
    const service = dragged
      ? services.find((s) => s.id === dragged.serviceId)
      : undefined;
    if (!dragged || !service) return null;

    const newStart = parseISO(dragOverTarget.slotISO);
    const sameSlot =
      dragged.technicianId === dragOverTarget.technicianId &&
      dragged.startISO === dragOverTarget.slotISO;
    const fits = wouldFitInDay(
      newStart,
      service,
      timezone,
      businessHours,
    );
    const overlaps = bookings.some(
      (b) =>
        b.id !== dragged.id &&
        b.technicianId === dragOverTarget.technicianId &&
        rangeOverlapsBooking(newStart, service.durationMinutes, b),
    );
    const valid = !sameSlot && fits && !overlaps;

    const label =
      dragged.customerName?.trim() || service.name;

    return {
      technicianId: dragOverTarget.technicianId,
      slotISO: dragOverTarget.slotISO,
      durationMinutes: service.durationMinutes,
      colorClassName: service.colorClassName,
      label,
      valid,
    };
  }, [
    bookings,
    businessHours,
    dragOverTarget,
    draggingBookingId,
    services,
    timezone,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CalendarHeader
        orgName={orgName}
        date={date}
        timezone={timezone}
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
        <>
          {dragError && (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {dragError}
            </div>
          )}
          {unclockedTechsWithBookings.length > 0 && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100"
            >
              <span aria-hidden>{"\u26A0"}</span>
              <span>
                {unclockedTechsWithBookings.length === 1
                  ? `${unclockedTechsWithBookings[0].firstName} has bookings today but isn't clocked in.`
                  : `${unclockedTechsWithBookings.length} technicians have bookings today but aren't clocked in: ${unclockedTechsWithBookings
                      .map((t) => t.firstName)
                      .join(", ")}.`}
              </span>
              {canMutateBookings && (
                <Link
                  href="/settings"
                  className="ml-auto rounded-md border border-amber-400 px-2 py-0.5 font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/40"
                >
                  Open Round Robin
                </Link>
              )}
            </div>
          )}
          <DayGrid
            date={date}
            timezone={timezone}
            businessHours={businessHours}
            sidebarTimeStepMinutes={sidebarTimeStepMinutes}
            technicians={orderedTechnicians}
            bookings={todaysBookings}
            clockedInIds={clockedInIds}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
            canCreateFromSlots={canMutateBookings}
            canDragBookings={canMutateBookings}
            bookingDragActive={bookingDragActive}
            bookingDragCaptureReady={bookingDragCaptureReady}
            draggingBookingId={draggingBookingId}
            dragSnapDurationMinutes={dragSnapDurationMinutes}
            dragOverTarget={dragOverTarget}
            dragGhost={dragGhost}
            onBookingDragStart={handleBookingDragStart}
            onBookingDragEnd={handleBookingDragEnd}
            onSlotDragOver={handleSlotDragOver}
            onSlotDrop={handleSlotDrop}
          />
        </>
      )}

      {popover && hasStaff && (
        <NewBookingPopover
          state={popover}
          timezone={timezone}
          businessHours={businessHours}
          technicians={orderedTechnicians}
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
