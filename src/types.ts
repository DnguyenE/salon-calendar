export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  priceSuffix?: "+";
  colorClassName: string;
  displayOrder: number;
  /** Weight toward daily calendar point totals for this booking type (default 1). */
  points: number;
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
  notes?: string | null;
  /** Client has checked in / is here (calendar shows name with strikethrough). */
  guestCheckedIn: boolean;
}

export type ProfileRole = "admin" | "staff";

/** Drop preview while dragging a booking between slots/columns. */
export interface DragGhostPreview {
  technicianId: string;
  slotISO: string;
  durationMinutes: number;
  colorClassName: string;
  label: string;
  valid: boolean;
}

export interface BusinessHours {
  openHour: number;
  closeHour: number;
  slotMinutes: number;
}
