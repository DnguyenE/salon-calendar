import type { Service } from "@/src/types";
import { createClient } from "@/utils/supabase/client";

interface ServiceRow {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  price_suffix: "+" | null;
  color_class_name: string;
  display_order: number;
}

const mapRow = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name,
  durationMinutes: row.duration_minutes,
  priceCents: row.price_cents,
  priceSuffix: row.price_suffix === "+" ? "+" : undefined,
  colorClassName: row.color_class_name,
  displayOrder: row.display_order,
});

const toRow = (s: Omit<Service, "id">) => ({
  name: s.name,
  duration_minutes: s.durationMinutes,
  price_cents: s.priceCents,
  price_suffix: s.priceSuffix ?? null,
  color_class_name: s.colorClassName,
  display_order: s.displayOrder,
});

export const servicesService = {
  async loadAll(): Promise<Service[]> {
    const { data, error } = await createClient()
      .from("services")
      .select("*")
      .order("display_order");
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as ServiceRow));
  },

  async add(
    input: Omit<Service, "id">,
    organizationId: string,
  ): Promise<Service> {
    const { data, error } = await createClient()
      .from("services")
      .insert({ ...toRow(input), organization_id: organizationId })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data as ServiceRow);
  },

  async update(service: Service): Promise<void> {
    const { error } = await createClient()
      .from("services")
      .update(toRow(service))
      .eq("id", service.id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await createClient()
      .from("services")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
