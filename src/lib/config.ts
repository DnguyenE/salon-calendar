import type { BusinessHours, Technician } from "@/src/types";

export const BUSINESS_HOURS: BusinessHours = {
  openHour: 10,
  closeHour: 18,
  slotMinutes: 15,
};

export const TECHNICIANS: Technician[] = [
  { id: "tech-1", name: "Tech 1" },
  { id: "tech-2", name: "Tech 2" },
  { id: "tech-3", name: "Tech 3" },
  { id: "tech-4", name: "Tech 4" },
  { id: "tech-5", name: "Tech 5" },
  { id: "tech-6", name: "Tech 6" },
];

export function getTechnician(id: string): Technician | undefined {
  return TECHNICIANS.find((t) => t.id === id);
}
