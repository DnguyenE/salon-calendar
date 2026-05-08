"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const DEV_PASSWORD = "password";

export interface TechnicianRecord {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  serviceIds: string[];
}

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T = null> = Ok<T> | Err;

const fail = (error: string): Err => ({ ok: false, error });
const ok = <T>(data: T): Ok<T> => ({ ok: true, data });

type AdminCtx =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<AdminCtx> {
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
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }
  return { ok: true, organizationId: profile.organization_id as string };
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Server actions must return a Result and never throw. An uncaught throw is
// masked in production as "An error occurred in the Server Components render"
// with no actionable detail in the UI, so wrap every action body with this.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

async function safeAction<T>(
  fallback: string,
  fn: () => Promise<Result<T>>,
): Promise<Result<T>> {
  try {
    return await fn();
  } catch (err) {
    console.error("[staff action]", fallback, err);
    return fail(errorMessage(err, fallback));
  }
}

export async function createTechnician(input: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<Result<TechnicianRecord>> {
  return safeAction("Failed to add staff.", async () => {
    const ctx = await requireAdmin();
    if (!ctx.ok) return fail(ctx.error);

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim().toLowerCase();
    if (!firstName) return fail("First name is required.");
    if (!isEmail(email)) return fail("Enter a valid email.");

    const admin = createAdminClient();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      return fail(createErr?.message ?? "Failed to create user.");
    }

    const { error: profileErr } = await admin.from("profiles").insert({
      id: created.user.id,
      organization_id: ctx.organizationId,
      role: "staff",
      email,
      first_name: firstName,
      last_name: lastName || null,
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return fail(profileErr.message);
    }

    return ok({
      id: created.user.id,
      firstName,
      lastName: lastName || null,
      email,
      serviceIds: [],
    });
  });
}

export async function updateTechnician(input: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<Result> {
  return safeAction("Failed to update staff.", async () => {
    const ctx = await requireAdmin();
    if (!ctx.ok) return fail(ctx.error);

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim().toLowerCase();
    if (!firstName) return fail("First name is required.");
    if (!isEmail(email)) return fail("Enter a valid email.");

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("profiles")
      .select("organization_id, email")
      .eq("id", input.id)
      .single();
    if (!existing || existing.organization_id !== ctx.organizationId) {
      return fail("Technician not found in your organization.");
    }

    if (existing.email !== email) {
      const { error: authErr } = await admin.auth.admin.updateUserById(
        input.id,
        { email },
      );
      if (authErr) return fail(authErr.message);
    }

    const { error } = await admin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        email,
      })
      .eq("id", input.id);
    if (error) return fail(error.message);

    return ok(null);
  });
}

export async function removeTechnician(id: string): Promise<Result> {
  return safeAction("Failed to remove staff.", async () => {
    const ctx = await requireAdmin();
    if (!ctx.ok) return fail(ctx.error);

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", id)
      .single();
    if (!existing || existing.organization_id !== ctx.organizationId) {
      return fail("Technician not found in your organization.");
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return fail(error.message);
    return ok(null);
  });
}

export async function setTechnicianServices(
  technicianId: string,
  serviceIds: string[],
): Promise<Result> {
  return safeAction("Failed to save services.", async () => {
    const ctx = await requireAdmin();
    if (!ctx.ok) return fail(ctx.error);

    const admin = createAdminClient();
    const { data: tech } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", technicianId)
      .single();
    if (!tech || tech.organization_id !== ctx.organizationId) {
      return fail("Technician not found in your organization.");
    }

    const unique = Array.from(new Set(serviceIds));
    if (unique.length > 0) {
      const { data: services } = await admin
        .from("services")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .in("id", unique);
      if (!services || services.length !== unique.length) {
        return fail("One or more services don't belong to your organization.");
      }
    }

    const { error: delErr } = await admin
      .from("technician_services")
      .delete()
      .eq("technician_id", technicianId);
    if (delErr) return fail(delErr.message);

    if (unique.length > 0) {
      const { error: insErr } = await admin.from("technician_services").insert(
        unique.map((service_id) => ({
          technician_id: technicianId,
          service_id,
        })),
      );
      if (insErr) return fail(insErr.message);
    }

    return ok(null);
  });
}
