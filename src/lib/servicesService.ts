import type { Service } from "@/src/types";

export interface ServicesService {
  loadAll(): Service[] | null;
  saveAll(services: Service[]): void;
}

const STORAGE_KEY = "salon-calendar:services:v1";

function isService(value: unknown): value is Service {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.durationMinutes === "number" &&
    typeof v.priceCents === "number" &&
    typeof v.colorClassName === "string" &&
    (v.priceSuffix === undefined || v.priceSuffix === "+")
  );
}

export const localStorageServicesService: ServicesService = {
  loadAll() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(isService);
    } catch {
      return null;
    }
  },

  saveAll(services) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  },
};

export const servicesService: ServicesService = localStorageServicesService;
