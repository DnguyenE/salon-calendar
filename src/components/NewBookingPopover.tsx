"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type {
  Booking,
  BusinessHours,
  Service,
  Technician,
} from "@/src/types";
import { useServices } from "@/src/store/useServices";
import {
  countAvailableTechs,
  pickAvailableTechByPoints,
  pickAvailableTech,
  rangeOverlapsBooking,
  slotsForDay,
  wouldFitInDay,
} from "@/src/lib/time";

export interface NewPopoverState {
  mode: "new";
  technicianId?: string;
  slotISO: string;
}

export interface EditPopoverState {
  mode: "edit";
  booking: Booking;
}

export type PopoverState = NewPopoverState | EditPopoverState;

const ANY_TECH = "any" as const;
type TechSelection = string | typeof ANY_TECH;

interface NewBookingPopoverProps {
  state: PopoverState;
  timezone: string;
  businessHours: BusinessHours;
  technicians: Technician[];
  bookingsForDay: Booking[];
  readOnly?: boolean;
  onClose: () => void;
  onCreate: (input: {
    technicianId: string;
    serviceId: string;
    customerName: string;
    slotISO: string;
    notes?: string | null;
    guestCheckedIn?: boolean;
  }) => void;
  onUpdate: (booking: Booking) => void;
  onDelete: (bookingId: string) => void;
}

function formatPrice(service: Service): string {
  const dollars = (service.priceCents / 100).toFixed(0);
  return `$${dollars}${service.priceSuffix ?? ""}`;
}

function isServiceAvailableForTech(
  service: Service,
  start: Date,
  tz: string,
  bookingsForTech: Booking[],
  ignoreBookingId: string | undefined,
  hours: BusinessHours,
): boolean {
  if (!wouldFitInDay(start, service, tz, hours)) return false;
  return !bookingsForTech.some(
    (b) =>
      b.id !== ignoreBookingId &&
      rangeOverlapsBooking(start, service.durationMinutes, b),
  );
}

export function NewBookingPopover({
  state,
  timezone,
  businessHours,
  technicians,
  bookingsForDay,
  readOnly = false,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: NewBookingPopoverProps) {
  const services = useServices((s) => s.services);
  const getTechnician = (id: string): Technician | undefined =>
    technicians.find((t) => t.id === id);
  const isEdit = state.mode === "edit";

  const initialSlotISO =
    state.mode === "new" ? state.slotISO : state.booking.startISO;

  const initialTechSelection: TechSelection =
    state.mode === "new"
      ? (state.technicianId ?? ANY_TECH)
      : state.booking.technicianId;

  const initialServiceId =
    state.mode === "edit" ? state.booking.serviceId : services[0]?.id ?? "";
  const initialName = state.mode === "edit" ? state.booking.customerName : "";
  const initialNotes =
    state.mode === "edit" ? (state.booking.notes ?? "") : "";
  const initialGuestCheckedIn =
    state.mode === "edit" ? Boolean(state.booking.guestCheckedIn) : false;

  const [selectedSlotISO, setSelectedSlotISO] = useState(initialSlotISO);
  const [techSelection, setTechSelection] =
    useState<TechSelection>(initialTechSelection);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [customerName, setCustomerName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [guestCheckedIn, setGuestCheckedIn] = useState(initialGuestCheckedIn);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const start = useMemo(() => parseISO(selectedSlotISO), [selectedSlotISO]);

  const ignoreBookingId = state.mode === "edit" ? state.booking.id : undefined;

  const slotOptions = useMemo(
    () => slotsForDay(start, timezone, businessHours),
    [businessHours, start, timezone],
  );

  const bookingsBySpecificTech = useMemo(() => {
    if (techSelection === ANY_TECH) return [] as Booking[];
    return bookingsForDay.filter((b) => b.technicianId === techSelection);
  }, [bookingsForDay, techSelection]);

  const servicesWithAvailability = useMemo(
    () =>
      services.map((s) => {
        let available: boolean;
        if (techSelection === ANY_TECH) {
          const techsOffering = technicians.filter((t) =>
            t.serviceIds.includes(s.id),
          );
          available =
            techsOffering.length > 0 &&
            pickAvailableTech(
              start,
              s.durationMinutes,
              bookingsForDay,
              techsOffering,
              timezone,
              ignoreBookingId,
              businessHours,
            ) !== null;
        } else {
          const tech = technicians.find((t) => t.id === techSelection);
          const offers = tech ? tech.serviceIds.includes(s.id) : false;
          available =
            offers &&
            isServiceAvailableForTech(
              s,
              start,
              timezone,
              bookingsBySpecificTech,
              ignoreBookingId,
              businessHours,
            );
        }
        return { service: s, available };
      }),
    [
      businessHours,
      services,
      technicians,
      start,
      techSelection,
      bookingsForDay,
      bookingsBySpecificTech,
      ignoreBookingId,
      timezone,
    ],
  );

  const effectiveServiceId = useMemo(() => {
    const current = servicesWithAvailability.find(
      (s) => s.service.id === serviceId && s.available,
    );
    if (current) return serviceId;
    return (
      servicesWithAvailability.find((s) => s.available)?.service.id ?? serviceId
    );
  }, [servicesWithAvailability, serviceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === effectiveServiceId),
    [services, effectiveServiceId],
  );

  const techsOfferingSelected = useMemo(() => {
    if (!selectedService) return [] as Technician[];
    return technicians.filter((t) =>
      t.serviceIds.includes(selectedService.id),
    );
  }, [technicians, selectedService]);

  const freeTechCount = useMemo(() => {
    if (!selectedService) return 0;
    return countAvailableTechs(
      start,
      selectedService.durationMinutes,
      bookingsForDay,
      techsOfferingSelected,
      timezone,
      ignoreBookingId,
      businessHours,
    );
  }, [
    businessHours,
    selectedService,
    start,
    bookingsForDay,
    techsOfferingSelected,
    ignoreBookingId,
    timezone,
  ]);

  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit =
    servicesWithAvailability.find((s) => s.service.id === effectiveServiceId)
      ?.available ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !canSubmit || !selectedService) return;
    const trimmedNotes = notes.trim() || null;
    if (state.mode === "new") {
      let resolvedTechId: string;
      if (techSelection === ANY_TECH) {
        const tech = pickAvailableTechByPoints(
          start,
          selectedService.durationMinutes,
          bookingsForDay,
          techsOfferingSelected,
          timezone,
          ignoreBookingId,
          businessHours,
        );
        if (!tech) return;
        resolvedTechId = tech.id;
      } else {
        resolvedTechId = techSelection;
      }
      onCreate({
        technicianId: resolvedTechId,
        serviceId: effectiveServiceId,
        customerName: customerName.trim(),
        slotISO: selectedSlotISO,
        notes: trimmedNotes,
        guestCheckedIn,
      });
    } else {
      onUpdate({
        ...state.booking,
        serviceId: effectiveServiceId,
        customerName: customerName.trim(),
        notes: trimmedNotes,
        guestCheckedIn,
      });
    }
    onClose();
  };

  const anyServiceAvailable = servicesWithAvailability.some((s) => s.available);

  const headerTechLabel =
    techSelection === ANY_TECH
      ? "Any available tech"
      : (getTechnician(techSelection)?.firstName ?? "Technician");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {readOnly
              ? "Appointment details"
              : isEdit
                ? "Edit appointment"
                : "New appointment"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {headerTechLabel} · {formatInTimeZone(start, timezone, "EEE MMM d")}{" "}
            · {formatInTimeZone(start, timezone, "h:mm a")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label
                htmlFor="slot-select"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Time
              </label>
              <select
                id="slot-select"
                value={selectedSlotISO}
                onChange={(e) => setSelectedSlotISO(e.target.value)}
                disabled={readOnly}
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              >
                {slotOptions.map((slot) => {
                  const iso = slot.toISOString();
                  return (
                    <option key={iso} value={iso}>
                      {formatInTimeZone(slot, timezone, "h:mm a")}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {!isEdit && (
            <div>
              <label
                htmlFor="tech-select"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Technician
              </label>
              <select
                id="tech-select"
                value={techSelection}
                onChange={(e) => setTechSelection(e.target.value)}
                disabled={readOnly}
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              >
                <option value={ANY_TECH}>Any available tech</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {freeTechCount} of {techsOfferingSelected.length} tech
                {techsOfferingSelected.length === 1 ? "" : "s"} free for this
                service at this time
              </p>
              {techSelection === ANY_TECH && (
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Any tech picks the available technician with the lowest daily
                  points; check-in order breaks ties.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Service
            </label>
            <div className="grid grid-cols-2 gap-2">
              {servicesWithAvailability.map(({ service, available }) => {
                const selected = service.id === effectiveServiceId;
                return (
                  <button
                    key={service.id}
                    type="button"
                    disabled={!available || readOnly}
                    onClick={() => {
                      if (readOnly) return;
                      setServiceId(service.id);
                    }}
                    className={`flex min-h-11 flex-col items-start justify-center rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
                    }`}
                  >
                    <span className="leading-tight">{service.name}</span>
                    <span className="mt-1 text-[10px] opacity-70">
                      {service.durationMinutes} min · {formatPrice(service)}
                    </span>
                  </button>
                );
              })}
            </div>
            {!anyServiceAvailable && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                {techSelection === ANY_TECH
                  ? "No tech is free for any service at this time."
                  : "No services fit in this time slot."}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="customer-name"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Customer name
            </label>
            <input
              id="customer-name"
              ref={nameInputRef}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              readOnly={readOnly}
              placeholder="(optional)"
              className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={guestCheckedIn}
              disabled={readOnly}
              onChange={(e) => setGuestCheckedIn(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-zinc-50"
            />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Checked in — client is here (appointment crossed out on calendar)
            </span>
          </label>

          {(!readOnly || notes.trim().length > 0) && (
            <div>
              <label
                htmlFor="booking-notes"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Notes
              </label>
              <input
                id="booking-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={readOnly}
                placeholder="(optional)"
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {isEdit && !readOnly ? (
              <button
                type="button"
                onClick={() => {
                  if (state.mode === "edit") {
                    onDelete(state.booking.id);
                    onClose();
                  }
                }}
                className="h-11 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                Delete
              </button>
            ) : !readOnly ? (
              <span />
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {readOnly ? "Close" : "Cancel"}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
