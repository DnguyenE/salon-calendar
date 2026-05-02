import { create } from "zustand";
import type { Service } from "@/src/types";
import { DEFAULT_SERVICES } from "@/src/lib/config";
import { servicesService } from "@/src/lib/servicesService";

interface ServicesState {
  services: Service[];
  hydrated: boolean;
  hydrate: () => void;
  addService: (service: Service) => void;
  updateService: (service: Service) => void;
  removeService: (id: string) => void;
}

export const useServices = create<ServicesState>((set, get) => ({
  services: DEFAULT_SERVICES,
  hydrated: false,

  hydrate() {
    if (get().hydrated) return;
    const stored = servicesService.loadAll();
    const services = stored ?? DEFAULT_SERVICES;
    if (!stored) {
      // Seed storage so subsequent edits start from a known baseline.
      servicesService.saveAll(services);
    }
    set({ services, hydrated: true });
  },

  addService(service) {
    const services = [...get().services, service];
    servicesService.saveAll(services);
    set({ services });
  },

  updateService(service) {
    const services = get().services.map((s) =>
      s.id === service.id ? service : s,
    );
    servicesService.saveAll(services);
    set({ services });
  },

  removeService(id) {
    const services = get().services.filter((s) => s.id !== id);
    servicesService.saveAll(services);
    set({ services });
  },
}));

/** Non-React accessor for use in pure helpers (e.g. lib/time.ts). */
export function getServiceById(id: string): Service | undefined {
  return useServices.getState().services.find((s) => s.id === id);
}
