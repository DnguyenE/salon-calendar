import { create } from "zustand";
import type { Service } from "@/src/types";
import { servicesService } from "@/src/lib/servicesService";

interface ServicesState {
  services: Service[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addService: (
    input: Omit<Service, "id">,
    organizationId: string,
  ) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  removeService: (id: string) => Promise<void>;
}

const errorOf = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export const useServices = create<ServicesState>((set, get) => ({
  services: [],
  hydrated: false,
  error: null,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const services = await servicesService.loadAll();
      set({ services, hydrated: true, error: null });
    } catch (err) {
      set({ error: errorOf(err, "Failed to load services.") });
    }
  },

  async addService(input, organizationId) {
    try {
      const created = await servicesService.add(input, organizationId);
      set((s) => ({ services: [...s.services, created], error: null }));
    } catch (err) {
      set({ error: errorOf(err, "Failed to add service.") });
    }
  },

  async updateService(service) {
    try {
      await servicesService.update(service);
      set((s) => ({
        services: s.services.map((x) => (x.id === service.id ? service : x)),
        error: null,
      }));
    } catch (err) {
      set({ error: errorOf(err, "Failed to save service.") });
    }
  },

  async removeService(id) {
    try {
      await servicesService.remove(id);
      set((s) => ({
        services: s.services.filter((x) => x.id !== id),
        error: null,
      }));
    } catch (err) {
      set({ error: errorOf(err, "Failed to remove service.") });
    }
  },
}));

export function getServiceById(id: string): Service | undefined {
  return useServices.getState().services.find((s) => s.id === id);
}
