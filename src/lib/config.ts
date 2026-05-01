import type { BusinessHours, Service, Technician } from "@/src/types";

export const BUSINESS_HOURS: BusinessHours = {
  openHour: 10,
  closeHour: 18,
  slotMinutes: 15,
};

export const SERVICES: Service[] = [
  {
    id: "manicure",
    name: "Manicure",
    durationMinutes: 30,
    colorClassName: "bg-rose-500/90 hover:bg-rose-500 text-white",
  },
  {
    id: "pedicure",
    name: "Pedicure",
    durationMinutes: 45,
    colorClassName: "bg-sky-500/90 hover:bg-sky-500 text-white",
  },
  {
    id: "combo",
    name: "Combo",
    durationMinutes: 75,
    colorClassName: "bg-violet-500/90 hover:bg-violet-500 text-white",
  },
];

export const TECHNICIANS: Technician[] = [
  { id: "tech-1", name: "Tech 1" },
  { id: "tech-2", name: "Tech 2" },
  { id: "tech-3", name: "Tech 3" },
  { id: "tech-4", name: "Tech 4" },
  { id: "tech-5", name: "Tech 5" },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getTechnician(id: string): Technician | undefined {
  return TECHNICIANS.find((t) => t.id === id);
}
