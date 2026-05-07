import { create } from "zustand";
import { isSameDay, parseISO } from "date-fns";
import type { Booking } from "@/src/types";
import {
  bookingsService,
  type BookingMutationInput,
} from "@/src/lib/bookingsService";

interface BookingsState {
  bookings: Booking[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addBooking: (booking: BookingMutationInput) => Promise<void>;
  updateBooking: (booking: BookingMutationInput & { id: string }) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  bookingsForDay: (date: Date) => Booking[];
  bookingsForTechnicianOnDay: (technicianId: string, date: Date) => Booking[];
}

export const useBookings = create<BookingsState>((set, get) => ({
  bookings: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const bookings = await bookingsService.loadAll();
    set({ bookings, hydrated: true });
  },

  async addBooking(booking) {
    const created = await bookingsService.add(booking);
    set((state) => ({ bookings: [...state.bookings, created] }));
  },

  async updateBooking(booking) {
    const updated = await bookingsService.update(booking);
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === updated.id ? updated : b)),
    }));
  },

  async deleteBooking(id) {
    await bookingsService.remove(id);
    set((state) => ({ bookings: state.bookings.filter((b) => b.id !== id) }));
  },

  bookingsForDay(date) {
    return get().bookings.filter((b) => isSameDay(parseISO(b.startISO), date));
  },

  bookingsForTechnicianOnDay(technicianId, date) {
    return get().bookings.filter(
      (b) =>
        b.technicianId === technicianId &&
        isSameDay(parseISO(b.startISO), date),
    );
  },
}));
