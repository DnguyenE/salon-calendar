export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  colorClassName: string;
}

export interface Technician {
  id: string;
  name: string;
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
