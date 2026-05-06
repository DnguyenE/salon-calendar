"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Service } from "@/src/types";
import { useServices } from "@/src/store/useServices";
import { useBookings } from "@/src/store/useBookings";
import { BUSINESS_HOURS } from "@/src/lib/config";
import {
  DEFAULT_SERVICE_COLOR,
  SERVICE_COLORS,
  findServiceColor,
} from "@/src/lib/servicePalette";
import { SettingsSection } from "./SettingsSection";

interface ServicesSectionProps {
  organizationId: string;
}

export function ServicesSection({ organizationId }: ServicesSectionProps) {
  const services = useServices((s) => s.services);
  const hydrated = useServices((s) => s.hydrated);
  const error = useServices((s) => s.error);
  const hydrate = useServices((s) => s.hydrate);
  const addService = useServices((s) => s.addService);
  const updateService = useServices((s) => s.updateService);
  const removeService = useServices((s) => s.removeService);

  const bookings = useBookings((s) => s.bookings);
  const hydrateBookings = useBookings((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateBookings();
  }, [hydrate, hydrateBookings]);

  const bookingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      map.set(b.serviceId, (map.get(b.serviceId) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  function handleAdd() {
    const usedColors = new Set(services.map((s) => s.colorClassName));
    const nextColor =
      SERVICE_COLORS.find((c) => !usedColors.has(c.className)) ??
      DEFAULT_SERVICE_COLOR;
    const nextOrder = Math.max(-1, ...services.map((s) => s.displayOrder)) + 1;
    void addService(
      {
        name: "New service",
        durationMinutes: BUSINESS_HOURS.slotMinutes * 2,
        priceCents: 0,
        colorClassName: nextColor.className,
        displayOrder: nextOrder,
      },
      organizationId,
    );
  }

  function handleRemove(service: Service) {
    const count = bookingCounts.get(service.id) ?? 0;
    const message =
      count > 0
        ? `Remove "${service.name}"? ${count} existing booking${count === 1 ? "" : "s"} use this service and will stop displaying.`
        : `Remove "${service.name}"?`;
    if (window.confirm(message)) {
      void removeService(service.id);
    }
  }

  return (
    <SettingsSection
      title="Services"
      description="Edit names, durations, prices, and colors. Add or remove services as needed."
    >
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {!hydrated ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              bookingCount={bookingCounts.get(service.id) ?? 0}
              onChange={(s) => void updateService(s)}
              onRemove={() => handleRemove(service)}
            />
          ))}

          {services.length === 0 && (
            <p className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No services yet. Add one below.
            </p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <span aria-hidden className="text-sm leading-none">+</span>
            Add service
          </button>
        </div>
      )}
    </SettingsSection>
  );
}

interface ServiceRowProps {
  service: Service;
  bookingCount: number;
  onChange: (service: Service) => void;
  onRemove: () => void;
}

function ServiceRow({
  service,
  bookingCount,
  onChange,
  onRemove,
}: ServiceRowProps) {
  const [draft, setDraft] = useState<Service>(service);
  const dirty =
    draft.name !== service.name ||
    draft.durationMinutes !== service.durationMinutes ||
    draft.priceCents !== service.priceCents ||
    draft.priceSuffix !== service.priceSuffix ||
    draft.colorClassName !== service.colorClassName;

  const save = () => dirty && onChange(draft);
  const cancel = () => setDraft(service);
  const onKey = (e: React.KeyboardEvent) => {
    if (!dirty) return;
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={`rounded-md border bg-zinc-50/50 p-2 transition-colors dark:bg-zinc-800/40 ${
        dirty
          ? "border-zinc-400 dark:border-zinc-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ColorSwatchPicker
          value={draft.colorClassName}
          onChange={(colorClassName) =>
            setDraft((d) => ({ ...d, colorClassName }))
          }
        />

        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onKeyDown={onKey}
          aria-label="Service name"
          placeholder="Service name"
          className="min-w-0 flex-1 basis-40 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />

        <DurationInput
          value={draft.durationMinutes}
          onChange={(durationMinutes) =>
            setDraft((d) => ({ ...d, durationMinutes }))
          }
          onKeyDown={onKey}
        />

        <PriceInput
          cents={draft.priceCents}
          suffix={draft.priceSuffix}
          onChange={(priceCents, priceSuffix) =>
            setDraft((d) => ({ ...d, priceCents, priceSuffix }))
          }
          onKeyDown={onKey}
        />

        {dirty ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={save}
              title="Save (Enter)"
              className="h-8 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              title="Cancel (Esc)"
              className="h-8 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${service.name}`}
            title={
              bookingCount > 0
                ? `Remove (${bookingCount} booking${bookingCount === 1 ? "" : "s"} will be hidden)`
                : "Remove"
            }
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-900 dark:hover:bg-rose-950 dark:hover:text-rose-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface DurationInputProps {
  value: number;
  onChange: (value: number) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function DurationInput({ value, onChange, onKeyDown }: DurationInputProps) {
  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white pl-2 pr-2 dark:border-zinc-700 dark:bg-zinc-900">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        onKeyDown={onKeyDown}
        aria-label="Duration in minutes"
        className="w-12 bg-transparent py-1.5 text-right text-sm text-zinc-900 outline-none dark:text-zinc-100"
      />
      <span className="select-none text-xs text-zinc-500 dark:text-zinc-400">
        min
      </span>
    </label>
  );
}

interface PriceInputProps {
  cents: number;
  suffix: "+" | undefined;
  onChange: (cents: number, suffix: "+" | undefined) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function PriceInput({ cents, suffix, onChange, onKeyDown }: PriceInputProps) {
  const dollars = Math.round(cents / 100);
  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white pl-2 pr-1 dark:border-zinc-700 dark:bg-zinc-900">
      <span className="select-none text-xs text-zinc-500 dark:text-zinc-400">
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={dollars === 0 ? "" : dollars}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100), suffix);
        }}
        onKeyDown={onKeyDown}
        aria-label="Price in dollars"
        className="w-14 bg-transparent py-1.5 text-sm text-zinc-900 outline-none dark:text-zinc-100"
      />
      <button
        type="button"
        onClick={() => onChange(cents, suffix === "+" ? undefined : "+")}
        aria-pressed={suffix === "+"}
        title={suffix === "+" ? 'Showing as "$N+"' : 'Mark as approximate ("+")'}
        className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold transition-colors ${
          suffix === "+"
            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            : "text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
        }`}
      >
        +
      </button>
    </label>
  );
}

interface ColorSwatchPickerProps {
  value: string;
  onChange: (className: string) => void;
}

function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = findServiceColor(value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Color: ${current.label}. Change color`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Color: ${current.label}`}
        className="h-8 w-8 rounded-md border border-zinc-300 transition-shadow hover:shadow-sm dark:border-zinc-600"
        style={{ backgroundColor: current.swatch }}
      />
      {open && (
        <div
          role="dialog"
          aria-label="Pick a color"
          className="absolute left-0 top-full z-30 mt-1.5 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="grid grid-cols-8 gap-1.5">
            {SERVICE_COLORS.map((color) => {
              const selected = color.className === value;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => {
                    onChange(color.className);
                    setOpen(false);
                  }}
                  aria-label={color.label}
                  aria-pressed={selected}
                  title={color.label}
                  className={`h-6 w-6 rounded transition-all ${
                    selected
                      ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color.swatch }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
