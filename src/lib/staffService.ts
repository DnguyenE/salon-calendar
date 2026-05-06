import type { Technician } from "@/src/types";
import { createClient } from "@/utils/supabase/client";

interface StaffRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  technician_services: { service_id: string }[] | null;
}

const mapRow = (row: StaffRow): Technician => ({
  id: row.id,
  firstName: row.first_name ?? "",
  lastName: row.last_name,
  email: row.email,
  serviceIds: (row.technician_services ?? []).map((t) => t.service_id),
});

export const staffService = {
  async loadAll(): Promise<Technician[]> {
    const { data, error } = await createClient()
      .from("profiles")
      .select("id, first_name, last_name, email, technician_services(service_id)")
      .eq("role", "staff")
      .order("first_name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as unknown as StaffRow));
  },
};
