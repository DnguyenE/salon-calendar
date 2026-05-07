"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Booking, Service, Technician } from "@/src/types";
import { useServices } from "@/src/store/useServices";
import { useStaff } from "@/src/store/useStaff";
import {
  countAvailableTechs,
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
  bookingsForDay: Booking[];
  onClose: () => void;
  onCreate: (input: {
    technicianId: string;
    serviceId: string;
    customerName: string;
    slotISO: string;
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
  bookingsForTech: Booking[],
  ignoreBookingId: string | undefined,
): boolean {
  if (!wouldFitInDay(start, service)) return false;
  return !bookingsForTech.some(
    (b) =>
      b.id !== ignoreBookingId &&
      rangeOverlapsBooking(start, service.durationMinutes, b),
  );
}

export function NewBookingPopover({
  state,
  bookingsForDay,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: NewBookingPopoverProps) {
  const services = useServices((s) => s.services);
  const technicians = useStaff((s) => s.technicians);
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

  const [selectedSlotISO, setSelectedSlotISO] = useState(initialSlotISO);
  const [techSelection, setTechSelection] =
    useState<TechSelection>(initialTechSelection);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [customerName, setCustomerName] = useState(initialName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const start = useMemo(() => parseISO(selectedSlotISO), [selectedSlotISO]);

  const ignoreBookingId = state.mode === "edit" ? state.booking.id : undefined;

  const slotOptions = useMemo(() => slotsForDay(start), [start]);

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
              ignoreBookingId,
            ) !== null;
        } else {
          const tech = technicians.find((t) => t.id === techSelection);
          const offers = tech ? tech.serviceIds.includes(s.id) : false;
          available =
            offers &&
            isServiceAvailableForTech(
              s,
              start,
              bookingsBySpecificTech,
              ignoreBookingId,
            );
        }
        return { service: s, available };
      }),
    [
      services,
      technicians,
      start,
      techSelection,
      bookingsForDay,
      bookingsBySpecificTech,
      ignoreBookingId,
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
      ignoreBookingId,
    );
  }, [
    selectedService,
    start,
    bookingsForDay,
    techsOfferingSelected,
    ignoreBookingId,
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
    if (!canSubmit || !selectedService) return;
    if (state.mode === "new") {
      let resolvedTechId: string;
      if (techSelection === ANY_TECH) {
        const tech = pickAvailableTech(
          start,
          selectedService.durationMinutes,
          bookingsForDay,
          techsOfferingSelected,
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
      });
    } else {
      onUpdate({
        ...state.booking,
        serviceId: effectiveServiceId,
        customerName: customerName.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {isEdit ? "Edit appointment" : "New appointment"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {headerTechLabel} · {format(start, "EEE MMM d")} ·{" "}
            {format(start, "h:mm a")}
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
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              >
                {slotOptions.map((slot) => {
                  const iso = slot.toISOString();
                  return (
                    <option key={iso} value={iso}>
                      {format(slot, "h:mm a")}
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
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
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
                    disabled={!available}
                    onClick={() => setServiceId(service.id)}
                    className={`flex flex-col items-start rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
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
              placeholder="(optional)"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (state.mode === "edit") {
                    onDelete(state.booking.id);
                    onClose();
                  }
                }}
                className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Done
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
