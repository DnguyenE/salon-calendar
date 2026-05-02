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
    priceCents: 2000,
    colorClassName: "bg-rose-500/90 hover:bg-rose-500 text-white",
  },
  {
    id: "shellac-manicure",
    name: "Shellac Manicure",
    durationMinutes: 30,
    priceCents: 3500,
    colorClassName: "bg-rose-600/90 hover:bg-rose-600 text-white",
  },
  {
    id: "pedicure",
    name: "Pedicure",
    durationMinutes: 30,
    priceCents: 3000,
    colorClassName: "bg-sky-500/90 hover:bg-sky-500 text-white",
  },
  {
    id: "shellac-pedicure",
    name: "Shellac Pedicure",
    durationMinutes: 45,
    priceCents: 4500,
    colorClassName: "bg-sky-600/90 hover:bg-sky-600 text-white",
  },
  {
    id: "mani-pedi",
    name: "Mani + Pedi",
    durationMinutes: 60,
    priceCents: 5000,
    colorClassName: "bg-violet-500/90 hover:bg-violet-500 text-white",
  },
  {
    id: "shellac-mani-pedi",
    name: "Shellac Mani + Pedi",
    durationMinutes: 75,
    priceCents: 6500,
    colorClassName: "bg-violet-600/90 hover:bg-violet-600 text-white",
  },
  {
    id: "full-set-acrylic",
    name: "Full Set Acrylic",
    durationMinutes: 60,
    priceCents: 5000,
    priceSuffix: "+",
    colorClassName: "bg-amber-500/90 hover:bg-amber-500 text-white",
  },
  {
    id: "acrylic-fill",
    name: "Acrylic Fill",
    durationMinutes: 45,
    priceCents: 4500,
    priceSuffix: "+",
    colorClassName: "bg-amber-400/90 hover:bg-amber-400 text-zinc-900",
  },
  {
    id: "full-set-bio",
    name: "Full Set Bio",
    durationMinutes: 60,
    priceCents: 6500,
    colorClassName: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
  },
  {
    id: "bio-fill",
    name: "Bio Fill",
    durationMinutes: 45,
    priceCents: 5500,
    priceSuffix: "+",
    colorClassName: "bg-emerald-400/90 hover:bg-emerald-400 text-zinc-900",
  },
  {
    id: "overlay-own-nail",
    name: "Overlay on Own Nail",
    durationMinutes: 60,
    priceCents: 6000,
    colorClassName: "bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white",
  },
];

export const TECHNICIANS: Technician[] = [
  { id: "tech-1", name: "Tech 1" },
  { id: "tech-2", name: "Tech 2" },
  { id: "tech-3", name: "Tech 3" },
  { id: "tech-4", name: "Tech 4" },
  { id: "tech-5", name: "Tech 5" },
  { id: "tech-6", name: "Tech 6" },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getTechnician(id: string): Technician | undefined {
  return TECHNICIANS.find((t) => t.id === id);
}
