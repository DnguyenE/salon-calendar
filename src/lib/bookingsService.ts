import type { Booking } from "@/src/types";
import { createClient } from "@/utils/supabase/client";

export interface BookingsService {
  loadAll(): Promise<Booking[]>;
  add(booking: BookingMutationInput): Promise<Booking>;
  update(booking: BookingMutationInput & { id: string }): Promise<Booking>;
  remove(id: string): Promise<void>;
}

export interface BookingMutationInput {
  technicianId: string;
  serviceId: string;
  customerName: string;
  startISO: string;
  durationMinutes: number;
  notes?: string | null;
}

interface BookingRow {
  id: string;
  organization_id: string;
  technician_id: string;
  service_id: string;
  customer_name: string;
  start_at: string;
  end_at: string;
  notes: string | null;
}

let organizationIdPromise: Promise<string> | null = null;

const rowToBooking = (row: BookingRow): Booking => ({
  id: row.id,
  technicianId: row.technician_id,
  serviceId: row.service_id,
  customerName: row.customer_name,
  startISO: row.start_at,
  notes: row.notes,
});

function toEndISO(startISO: string, durationMinutes: number): string {
  return new Date(
    new Date(startISO).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
}

async function getOrganizationId(): Promise<string> {
  if (!organizationIdPromise) {
    organizationIdPromise = (async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error(userErr?.message ?? "Missing authenticated user.");
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (error || !data?.organization_id) {
        throw new Error(
          error?.message ?? "Could not resolve organization for current user.",
        );
      }
      return data.organization_id as string;
    })();
  }
  return organizationIdPromise;
}

export const supabaseBookingsService: BookingsService = {
  async loadAll() {
    const { data, error } = await createClient()
      .from("bookings")
      .select(
        "id, organization_id, technician_id, service_id, customer_name, start_at, end_at, notes",
      )
      .order("start_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => rowToBooking(row as BookingRow));
  },
  async add(booking) {
    const organizationId = await getOrganizationId();
    const payload = {
      organization_id: organizationId,
      technician_id: booking.technicianId,
      service_id: booking.serviceId,
      customer_name: booking.customerName,
      start_at: booking.startISO,
      end_at: toEndISO(booking.startISO, booking.durationMinutes),
      notes: booking.notes ?? null,
    };
    const { data, error } = await createClient()
      .from("bookings")
      .insert(payload)
      .select(
        "id, organization_id, technician_id, service_id, customer_name, start_at, end_at, notes",
      )
      .single();
    if (error) throw error;
    return rowToBooking(data as BookingRow);
  },

  async update(booking) {
    const payload = {
      technician_id: booking.technicianId,
      service_id: booking.serviceId,
      customer_name: booking.customerName,
      start_at: booking.startISO,
      end_at: toEndISO(booking.startISO, booking.durationMinutes),
      notes: booking.notes ?? null,
    };
    const { data, error } = await createClient()
      .from("bookings")
      .update(payload)
      .eq("id", booking.id)
      .select(
        "id, organization_id, technician_id, service_id, customer_name, start_at, end_at, notes",
      )
      .single();
    if (error) throw error;
    return rowToBooking(data as BookingRow);
  },

  async remove(id) {
    const { error } = await createClient().from("bookings").delete().eq("id", id);
    if (error) throw error;
  },
};

export const bookingsService: BookingsService = supabaseBookingsService;
