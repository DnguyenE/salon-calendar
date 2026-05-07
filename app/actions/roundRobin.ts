"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
const fail = (error: string): Err => ({ ok: false, error });

const isDateKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

type MemberCtx =
  | { ok: true; organizationId: string; role: "admin" | "staff" }
  | { ok: false; error: string };

async function requireOrgMember(): Promise<MemberCtx> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return { ok: false, error: "Organization membership required." };
  }

  return {
    ok: true,
    organizationId: profile.organization_id as string,
    role: profile.role as "admin" | "staff",
  };
}

export async function getDailyRoundRobin(
  serviceDate: string,
): Promise<Result<string[]>> {
  if (!isDateKey(serviceDate)) return fail("Invalid date.");

  const member = await requireOrgMember();
  if (!member.ok) return fail(member.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("daily_round_robin")
    .select("technician_id, position")
    .eq("organization_id", member.organizationId)
    .eq("service_date", serviceDate)
    .order("position", { ascending: true });

  if (error) return fail(error.message);
  return ok((data ?? []).map((row) => row.technician_id as string));
}

export async function setDailyRoundRobin(
  serviceDate: string,
  technicianIdsInOrder: string[],
): Promise<Result<null>> {
  if (!isDateKey(serviceDate)) return fail("Invalid date.");

  const member = await requireOrgMember();
  if (!member.ok) return fail(member.error);
  if (member.role !== "admin") return fail("Admin access required.");

  const uniqueIds = Array.from(new Set(technicianIdsInOrder));
  const admin = createAdminClient();

  if (uniqueIds.length > 0) {
    const { data: technicians, error: techErr } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", member.organizationId)
      .eq("role", "staff")
      .in("id", uniqueIds);

    if (techErr) return fail(techErr.message);
    if (!technicians || technicians.length !== uniqueIds.length) {
      return fail("One or more technicians are invalid for your organization.");
    }
  }

  const { error: delErr } = await admin
    .from("daily_round_robin")
    .delete()
    .eq("organization_id", member.organizationId)
    .eq("service_date", serviceDate);
  if (delErr) return fail(delErr.message);

  if (uniqueIds.length === 0) return ok(null);

  const { error: insErr } = await admin.from("daily_round_robin").insert(
    uniqueIds.map((technician_id, position) => ({
      organization_id: member.organizationId,
      service_date: serviceDate,
      technician_id,
      position,
    })),
  );
  if (insErr) return fail(insErr.message);

  return ok(null);
}
