"use client";

import { useEffect } from "react";
import { useTheme, type Theme } from "@/src/store/useTheme";
import { SettingsRow, SettingsSection } from "./SettingsSection";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceSection() {
  const theme = useTheme((s) => s.theme);
  const hydrated = useTheme((s) => s.hydrated);
  const hydrate = useTheme((s) => s.hydrate);
  const setTheme = useTheme((s) => s.setTheme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SettingsSection
      title="Appearance"
      description="Choose how the calendar looks on this device."
    >
      <SettingsRow
        label="Theme"
        description="Switch between light and dark mode."
        control={
          <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {THEME_OPTIONS.map(({ value, label }) => {
              const selected = hydrated && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  className={`min-w-[64px] rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />
    </SettingsSection>
  );
}
