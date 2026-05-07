"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useStaff } from "@/src/store/useStaff";
import {
  getDailyRoundRobin,
  setDailyRoundRobin,
} from "@/app/actions/roundRobin";
import { SettingsSection } from "./SettingsSection";

interface RoundRobinSectionProps {
  isAdmin: boolean;
}

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function RoundRobinSection({ isAdmin }: RoundRobinSectionProps) {
  const technicians = useStaff((s) => s.technicians);
  const hydrateStaff = useStaff((s) => s.hydrate);
  const staffHydrated = useStaff((s) => s.hydrated);

  const [serviceDate, setServiceDate] = useState(() => dateKey(new Date()));
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrateStaff();
  }, [hydrateStaff]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const res = await getDailyRoundRobin(serviceDate);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        setRosterIds([]);
        return;
      }
      setError(null);
      setRosterIds(res.data);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [serviceDate]);

  const clockedInIds = new Set(rosterIds);
  const roster = rosterIds
    .map((id) => technicians.find((t) => t.id === id))
    .filter(Boolean);

  const saveRoster = async (next: string[]) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    const res = await setDailyRoundRobin(serviceDate, next);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setRosterIds(next);
  };

  return (
    <SettingsSection
      title="Round Robin"
      description="Set check-in order for this day. Calendar columns are reordered left-to-right by this list."
    >
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <div className="mb-3 flex items-center gap-2">
        <label
          htmlFor="round-robin-date"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          Service date
        </label>
        <input
          id="round-robin-date"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      {!staffHydrated || loading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Staff Master List
            </p>
            <div className="space-y-2">
              {technicians.map((tech) => {
                const isClockedIn = clockedInIds.has(tech.id);
                return (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700"
                  >
                    <span className="truncate">
                      {[tech.firstName, tech.lastName].filter(Boolean).join(" ")}
                    </span>
                    {isAdmin ? (
                      <button
                        type="button"
                        disabled={isClockedIn || saving}
                        onClick={() => void saveRoster([...rosterIds, tech.id])}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {isClockedIn ? "Clocked in" : "Clock in"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isClockedIn ? "Clocked in" : "Not clocked in"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Daily Order
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void saveRoster([])}
                  disabled={rosterIds.length === 0 || saving}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Clear
                </button>
              )}
            </div>

            {roster.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No check-in order set for this day yet.
              </p>
            ) : (
              <div className="space-y-2">
                {roster.map((tech, idx) => {
                  const techId = tech?.id ?? "";
                  return (
                    <div
                      key={techId || `missing-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700"
                    >
                      <span className="truncate">
                        {idx + 1}.{" "}
                        {tech
                          ? [tech.firstName, tech.lastName]
                              .filter(Boolean)
                              .join(" ")
                          : "Unknown staff"}
                      </span>
                      {isAdmin && tech && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0 || saving}
                            onClick={() => {
                              const next = [...rosterIds];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              void saveRoster(next);
                            }}
                            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === roster.length - 1 || saving}
                            onClick={() => {
                              const next = [...rosterIds];
                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                              void saveRoster(next);
                            }}
                            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void saveRoster(rosterIds.filter((id) => id !== tech.id))
                            }
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Only admins can edit round-robin order.
        </p>
      )}
    </SettingsSection>
  );
}
