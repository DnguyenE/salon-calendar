import { create } from "zustand";
import { THEME_STORAGE_KEY } from "@/src/lib/themeBootstrap";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function writeStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "light",
  hydrated: false,

  hydrate() {
    if (get().hydrated) return;
    const theme = readStoredTheme();
    applyTheme(theme);
    set({ theme, hydrated: true });
  },

  setTheme(theme) {
    writeStoredTheme(theme);
    applyTheme(theme);
    set({ theme, hydrated: true });
  },
}));
