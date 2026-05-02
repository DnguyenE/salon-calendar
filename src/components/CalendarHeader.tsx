"use client";

import { addDays, format, isSameDay } from "date-fns";

interface CalendarHeaderProps {
  date: Date;
  onChange: (date: Date) => void;
  onNewAppointment: () => void;
}

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fromDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function CalendarHeader({
  date,
  onChange,
  onNewAppointment,
}: CalendarHeaderProps) {
  const today = new Date();
  const isToday = isSameDay(date, today);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Lucy Nails
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDays(date, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          aria-label="Previous day"
        >
          <span aria-hidden>‹</span>
        </button>

        <div className="flex flex-col items-center px-2 min-w-[180px]">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {format(date, "EEEE")}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {format(date, "MMMM d, yyyy")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(addDays(date, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          aria-label="Next day"
        >
          <span aria-hidden>›</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewAppointment}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <span aria-hidden>+</span>
          New appointment
        </button>
        <input
          type="date"
          value={toDateInputValue(date)}
          onChange={(e) => {
            if (e.target.value) onChange(fromDateInputValue(e.target.value));
          }}
          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => onChange(today)}
          disabled={isToday}
          className="h-9 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Today
        </button>
      </div>
    </header>
  );
}
