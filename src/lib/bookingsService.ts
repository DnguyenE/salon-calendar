import type { Booking } from "@/src/types";

export interface BookingsService {
  loadAll(): Promise<Booking[]>;
  add(booking: Booking): Promise<void>;
  update(booking: Booking): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = "salon-calendar:bookings:v1";

function readAllSync(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Booking[];
  } catch {
    return [];
  }
}

function writeAllSync(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export const localStorageBookingsService: BookingsService = {
  async loadAll() {
    return readAllSync();
  },
  async add(booking) {
    const all = readAllSync();
    all.push(booking);
    writeAllSync(all);
  },
  async update(booking) {
    const all = readAllSync();
    const next = all.map((b) => (b.id === booking.id ? booking : b));
    writeAllSync(next);
  },
  async remove(id) {
    const all = readAllSync();
    writeAllSync(all.filter((b) => b.id !== id));
  },
};

export const bookingsService: BookingsService = localStorageBookingsService;
