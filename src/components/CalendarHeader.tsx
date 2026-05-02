"use client";

import Link from "next/link";
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
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 13.6a1.6 1.6 0 0 0 .32 1.76l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-1 1.46V19.5a2 2 0 1 1-4 0v-.07a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-1H3.5a2 2 0 1 1 0-4h.07a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.76.32H9.4a1.6 1.6 0 0 0 1-1.46V3.5a2 2 0 1 1 4 0v.07a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.76V9.4a1.6 1.6 0 0 0 1.46 1H20.5a2 2 0 1 1 0 4h-.07a1.6 1.6 0 0 0-1.46 1Z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
