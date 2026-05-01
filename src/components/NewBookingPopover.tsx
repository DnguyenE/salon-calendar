"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Booking, Service } from "@/src/types";
import { SERVICES, getTechnician } from "@/src/lib/config";
import { rangeOverlapsBooking, wouldFitInDay } from "@/src/lib/time";

export interface NewPopoverState {
  mode: "new";
  technicianId: string;
  slotISO: string;
}

export interface EditPopoverState {
  mode: "edit";
  booking: Booking;
}

export type PopoverState = NewPopoverState | EditPopoverState;

interface NewBookingPopoverProps {
  state: PopoverState;
  existingBookingsForTechnician: Booking[];
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

function isServiceAvailable(
  service: Service,
  start: Date,
  existingBookings: Booking[],
  ignoreBookingId?: string,
): boolean {
  if (!wouldFitInDay(start, service)) return false;
  const others = ignoreBookingId
    ? existingBookings.filter((b) => b.id !== ignoreBookingId)
    : existingBookings;
  return !others.some((b) =>
    rangeOverlapsBooking(start, service.durationMinutes, b),
  );
}

export function NewBookingPopover({
  state,
  existingBookingsForTechnician,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: NewBookingPopoverProps) {
  const isEdit = state.mode === "edit";

  const start = useMemo(
    () =>
      state.mode === "new"
        ? parseISO(state.slotISO)
        : parseISO(state.booking.startISO),
    [state],
  );

  const technicianId =
    state.mode === "new" ? state.technicianId : state.booking.technicianId;
  const technician = getTechnician(technicianId);

  const initialServiceId =
    state.mode === "edit" ? state.booking.serviceId : SERVICES[0]?.id ?? "";
  const initialName = state.mode === "edit" ? state.booking.customerName : "";

  const [serviceId, setServiceId] = useState(initialServiceId);
  const [customerName, setCustomerName] = useState(initialName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const ignoreBookingId = state.mode === "edit" ? state.booking.id : undefined;

  const servicesWithAvailability = useMemo(
    () =>
      SERVICES.map((s) => ({
        service: s,
        available: isServiceAvailable(
          s,
          start,
          existingBookingsForTechnician,
          ignoreBookingId,
        ),
      })),
    [start, existingBookingsForTechnician, ignoreBookingId],
  );

  useEffect(() => {
    const firstAvailable = servicesWithAvailability.find(
      (s) => s.service.id === serviceId && s.available,
    );
    if (!firstAvailable) {
      const alt = servicesWithAvailability.find((s) => s.available);
      if (alt) setServiceId(alt.service.id);
    }
  }, [servicesWithAvailability, serviceId]);

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
    servicesWithAvailability.find((s) => s.service.id === serviceId)
      ?.available ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (state.mode === "new") {
      onCreate({
        technicianId,
        serviceId,
        customerName: customerName.trim(),
        slotISO: state.slotISO,
      });
    } else {
      onUpdate({
        ...state.booking,
        serviceId,
        customerName: customerName.trim(),
      });
    }
    onClose();
  };

  const anyAvailable = servicesWithAvailability.some((s) => s.available);

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
            {technician?.name ?? "Technician"} · {format(start, "EEE MMM d")} ·{" "}
            {format(start, "h:mm a")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Service
            </label>
            <div className="grid grid-cols-3 gap-2">
              {servicesWithAvailability.map(({ service, available }) => {
                const selected = service.id === serviceId;
                return (
                  <button
                    key={service.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setServiceId(service.id)}
                    className={`flex flex-col items-center rounded-md border px-2 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
                    }`}
                  >
                    <span>{service.name}</span>
                    <span className="mt-0.5 text-[10px] opacity-70">
                      {service.durationMinutes} min
                    </span>
                  </button>
                );
              })}
            </div>
            {!anyAvailable && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                No services fit in this time slot.
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
