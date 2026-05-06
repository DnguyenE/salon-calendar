export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  priceSuffix?: "+";
  colorClassName: string;
  displayOrder: number;
}

export interface Technician {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  serviceIds: string[];
}

export function technicianName(t: Technician): string {
  return [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
}

export interface Booking {
  id: string;
  technicianId: string;
  serviceId: string;
  customerName: string;
  startISO: string;
}

export interface BusinessHours {
  openHour: number;
  closeHour: number;
  slotMinutes: number;
}
