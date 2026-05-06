import { create } from "zustand";
import type { Technician } from "@/src/types";
import { staffService } from "@/src/lib/staffService";
import {
  createTechnician,
  removeTechnician,
  setTechnicianServices,
  updateTechnician,
} from "@/app/actions/staff";

interface StaffState {
  technicians: Technician[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addTechnician: (input: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateTechnician: (input: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeTechnician: (id: string) => Promise<{ ok: boolean; error?: string }>;
  setTechnicianServices: (
    id: string,
    serviceIds: string[],
  ) => Promise<{ ok: boolean; error?: string }>;
}

const errorOf = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export const useStaff = create<StaffState>((set, get) => ({
  technicians: [],
  hydrated: false,
  error: null,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const technicians = await staffService.loadAll();
      set({ technicians, hydrated: true, error: null });
    } catch (err) {
      set({ error: errorOf(err, "Failed to load staff.") });
    }
  },

  async addTechnician(input) {
    const res = await createTechnician(input);
    if (!res.ok) {
      set({ error: res.error });
      return { ok: false, error: res.error };
    }
    set((s) => ({
      technicians: [...s.technicians, res.data].sort((a, b) =>
        a.firstName.localeCompare(b.firstName),
      ),
      error: null,
    }));
    return { ok: true };
  },

  async updateTechnician(input) {
    const res = await updateTechnician(input);
    if (!res.ok) {
      set({ error: res.error });
      return { ok: false, error: res.error };
    }
    set((s) => ({
      technicians: s.technicians
        .map((t) =>
          t.id === input.id
            ? {
                ...t,
                firstName: input.firstName,
                lastName: input.lastName || null,
                email: input.email,
              }
            : t,
        )
        .sort((a, b) => a.firstName.localeCompare(b.firstName)),
      error: null,
    }));
    return { ok: true };
  },

  async removeTechnician(id) {
    const res = await removeTechnician(id);
    if (!res.ok) {
      set({ error: res.error });
      return { ok: false, error: res.error };
    }
    set((s) => ({
      technicians: s.technicians.filter((t) => t.id !== id),
      error: null,
    }));
    return { ok: true };
  },

  async setTechnicianServices(id, serviceIds) {
    const res = await setTechnicianServices(id, serviceIds);
    if (!res.ok) {
      set({ error: res.error });
      return { ok: false, error: res.error };
    }
    set((s) => ({
      technicians: s.technicians.map((t) =>
        t.id === id ? { ...t, serviceIds: [...serviceIds] } : t,
      ),
      error: null,
    }));
    return { ok: true };
  },
}));

export function getTechnicianById(id: string): Technician | undefined {
  return useStaff.getState().technicians.find((t) => t.id === id);
}
